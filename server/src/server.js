
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { pool, query, ensureDatabaseSchema, ensureDefaultAdmin } from "./db.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("REPLACE")) {
  throw new Error("Set a strong JWT_SECRET in the server .env file before starting the API.");
}

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: "20kb" }));

app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
}));

function createToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function makeDateTimeFromClock(value, referenceDate = new Date()) {
  const [hours, minutes] = String(value).split(":").map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT id, name, email, role, status
       FROM users WHERE id = $1`,
      [payload.sub]
    );

    const user = result.rows[0];

    if (!user || user.status !== "active" || user.role !== payload.role) {
      return res.status(401).json({ message: "Account is unavailable." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permission denied." });
    }
    next();
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      service: "Nepal Transit API",
    });
  } catch {
    res.status(503).json({
      status: "error",
      message: "Database connection failed.",
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, termsAccepted } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 10 ||
      password.length > 72 ||
      termsAccepted !== "true" && termsAccepted !== true
    ) {
      return res.status(400).json({
        message: "Enter a valid name and email, accept the Terms and Conditions, and provide a password of 10–72 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (
         name,
         email,
         password_hash,
         role,
         terms_accepted_at
       )
       VALUES ($1, $2, $3, 'passenger', NOW())
       RETURNING id, name, email, role, status`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: "Account created successfully.",
      user,
      token: createToken(user),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration failed:", error.message);
    res.status(500).json({ message: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 255 ||
      password.length > 72
    ) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const result = await query(
      `SELECT id, name, email, password_hash, role, status
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash)) ||
      user.status !== "active"
    ) {
      return res.status(401).json({
        message: "Invalid credentials or unavailable account.",
      });
    }

    const { password_hash, ...safeUser } = user;

    res.json({
      message: "Login successful.",
      user: safeUser,
      token: createToken(safeUser),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ message: "Could not sign in." });
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/routes/schedules", authenticate, async (req, res) => {
  try {
    if (!['driver', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: "Only drivers or admins can create schedules." });
    }

    const {
      routeId,
      routeName,
      startLocation,
      endLocation,
      departureTime,
      arrivalTime,
      stopName,
      stopTime,
    } = req.body;

    const sanitizedRouteName = typeof routeName === "string" ? routeName.trim() : "";
    const sanitizedStartLocation = typeof startLocation === "string" ? startLocation.trim() : "";
    const sanitizedEndLocation = typeof endLocation === "string" ? endLocation.trim() : "";
    const sanitizedStopName = typeof stopName === "string" ? stopName.trim() : "";

    if (!sanitizedRouteName || !sanitizedStartLocation || !sanitizedEndLocation || !departureTime || !arrivalTime) {
      return res.status(400).json({ message: "Route name, departure, arrival, start and end locations are required." });
    }

    const routePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!routePattern.test(String(departureTime)) || !routePattern.test(String(arrivalTime))) {
      return res.status(400).json({ message: "Departure and arrival times must use HH:MM format." });
    }

    let finalRouteId = routeId ?? null;
    if (finalRouteId && !isValidUuid(finalRouteId)) {
      return res.status(400).json({ message: "Invalid route ID." });
    }

    if (!finalRouteId) {
      const routeResult = await query(
        `INSERT INTO routes (name, start_location, end_location)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [sanitizedRouteName, sanitizedStartLocation, sanitizedEndLocation]
      );

      finalRouteId = routeResult.rows[0]?.id;
    }

    let assignedBusId = null;
    if (req.user.role === "driver") {
      const busResult = await query(
        `SELECT id FROM buses
         WHERE driver_id = $1 AND status = 'active'
         LIMIT 1`,
        [req.user.id]
      );

      assignedBusId = busResult.rows[0]?.id ?? null;
    }

    if (!assignedBusId) {
      const availableBusResult = await query(
        `SELECT id FROM buses
         WHERE status = 'active'
           AND (driver_id IS NULL OR driver_id = $1)
         ORDER BY created_at ASC
         LIMIT 1`,
        [req.user.id]
      );

      assignedBusId = availableBusResult.rows[0]?.id ?? null;

      if (assignedBusId) {
        await query(
          `UPDATE buses
           SET driver_id = $1, route_id = $2, status = 'active', updated_at = NOW()
           WHERE id = $3`,
          [req.user.id, finalRouteId, assignedBusId]
        );
      }
    }

    if (!assignedBusId) {
      return res.status(400).json({ message: "No active bus is available for this schedule." });
    }

    const departureDateTime = makeDateTimeFromClock(departureTime);
    const arrivalDateTime = makeDateTimeFromClock(arrivalTime, departureDateTime);
    if (arrivalDateTime < departureDateTime) {
      arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
    }

    const scheduleResult = await query(
      `INSERT INTO schedules (
         driver_id,
         bus_id,
         route_id,
         departure_at,
         expected_arrival_at,
         status,
         is_available
       )
       VALUES ($1, $2, $3, $4, $5, 'published', TRUE)
       RETURNING *`,
      [
        req.user.id,
        assignedBusId,
        finalRouteId,
        departureDateTime,
        arrivalDateTime,
      ]
    );

    const schedule = scheduleResult.rows[0];

    return res.status(201).json({
      message: "Route schedule created successfully.",
      schedule: {
        id: schedule.id,
        driver_id: schedule.driver_id,
        bus_id: schedule.bus_id,
        route_id: schedule.route_id,
        route_name: sanitizedRouteName,
        start_location: sanitizedStartLocation,
        end_location: sanitizedEndLocation,
        departure_time: schedule.departure_at ? new Date(schedule.departure_at).toTimeString().slice(0, 5) : departureTime,
        arrival_time: schedule.expected_arrival_at ? new Date(schedule.expected_arrival_at).toTimeString().slice(0, 5) : arrivalTime,
        stop_name: sanitizedStopName || null,
        stop_time: stopTime || null,
        is_active: schedule.is_available,
        created_at: schedule.created_at,
      },
    });
  } catch (error) {
    console.error("Route schedule failed:", error.message);
    return res.status(500).json({ message: "Unable to save route schedule." });
  }
});

app.get("/api/routes/search", async (req, res) => {
  try {
    const from = (req.query.from || "").toString().trim();
    const to = (req.query.to || "").toString().trim();
    const time = (req.query.time || "").toString().trim();

    let queryText = `
      SELECT
        s.id,
        s.driver_id,
        s.route_id,
        r.name AS route_name,
        r.start_location,
        r.end_location,
        CAST(s.departure_at AS TIME) AS departure_time,
        CAST(s.expected_arrival_at AS TIME) AS arrival_time,
        NULL::VARCHAR(150) AS stop_name,
        NULL::TIME AS stop_time,
        u.name AS driver_name,
        b.bus_number,
        s.created_at
      FROM schedules s
      LEFT JOIN routes r ON r.id = s.route_id
      LEFT JOIN users u ON u.id = s.driver_id
      LEFT JOIN buses b ON b.id = s.bus_id
      WHERE s.status = 'published' AND s.is_available = TRUE
    `;

    const params = [];
    let index = 1;

    if (from) {
      queryText += ` AND r.start_location ILIKE $${index++}`;
      params.push(`%${from}%`);
    }

    if (to) {
      queryText += ` AND r.end_location ILIKE $${index++}`;
      params.push(`%${to}%`);
    }

    if (time) {
      queryText += ` AND CAST(s.departure_at AS TIME) >= ($${index}::time - INTERVAL '30 minutes')`;
      queryText += ` AND CAST(s.departure_at AS TIME) <= ($${index}::time + INTERVAL '60 minutes')`;
      params.push(time);
      index += 1;
    }

    queryText += ` ORDER BY CAST(s.departure_at AS TIME) ASC LIMIT 50`;

    const result = await query(queryText, params);

    res.json({ routes: result.rows });
  } catch (error) {
    console.error("Route search failed:", error.message);
    return res.status(500).json({ message: "Unable to search routes." });
  }
});

app.get("/api/routes", async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        s.id,
        s.driver_id,
        s.route_id,
        r.name AS route_name,
        r.start_location,
        r.end_location,
        CAST(s.departure_at AS TIME) AS departure_time,
        CAST(s.expected_arrival_at AS TIME) AS arrival_time,
        NULL::VARCHAR(150) AS stop_name,
        NULL::TIME AS stop_time,
        u.name AS driver_name,
        b.bus_number
      FROM schedules s
      LEFT JOIN routes r ON r.id = s.route_id
      LEFT JOIN users u ON u.id = s.driver_id
      LEFT JOIN buses b ON b.id = s.bus_id
      WHERE s.status = 'published' AND s.is_available = TRUE
      ORDER BY CAST(s.departure_at AS TIME) ASC
      LIMIT 100
    `);

    res.json({ routes: result.rows });
  } catch (error) {
    console.error("Route list failed:", error.message);
    res.status(500).json({ message: "Unable to list routes." });
  }
});

app.get("/api/passenger/route-status", async (req, res) => {
  try {
    const from = (req.query.from || "").toString().trim();
    const to = (req.query.to || "").toString().trim();
    const time = (req.query.time || "").toString().trim();

    let queryText = `
      SELECT
        s.id,
        r.name AS route_name,
        r.start_location,
        r.end_location,
        CAST(s.departure_at AS TIME) AS departure_time,
        CAST(s.expected_arrival_at AS TIME) AS arrival_time,
        NULL::VARCHAR(150) AS stop_name,
        NULL::TIME AS stop_time,
        u.name AS driver_name,
        b.bus_number,
        t.id AS trip_id,
        t.status AS trip_status,
        bl.speed_kmh,
        ST_Y(bl.location::geometry) AS latitude,
        ST_X(bl.location::geometry) AS longitude,
        bl.recorded_at
      FROM schedules s
      LEFT JOIN routes r ON r.id = s.route_id
      LEFT JOIN users u ON u.id = s.driver_id
      LEFT JOIN buses b ON b.id = s.bus_id
      LEFT JOIN trips t ON t.bus_id = b.id AND t.status = 'active'
      LEFT JOIN LATERAL (
        SELECT location, speed_kmh, recorded_at
        FROM bus_locations
        WHERE trip_id = t.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) bl ON TRUE
      WHERE s.status = 'published' AND s.is_available = TRUE
    `;

    const params = [];
    let index = 1;

    if (from) {
      queryText += ` AND r.start_location ILIKE $${index++}`;
      params.push(`%${from}%`);
    }

    if (to) {
      queryText += ` AND r.end_location ILIKE $${index++}`;
      params.push(`%${to}%`);
    }

    if (time) {
      queryText += ` AND CAST(s.departure_at AS TIME) >= ($${index}::time - INTERVAL '30 minutes')`;
      params.push(time);
      queryText += ` AND CAST(s.departure_at AS TIME) <= ($${index}::time + INTERVAL '90 minutes')`;
      params.push(time);
      index += 1;
    }

    queryText += ` ORDER BY CAST(s.departure_at AS TIME) ASC LIMIT 25`;

    const result = await query(queryText, params);

    res.json({ routeStatus: result.rows });
  } catch (error) {
    console.error("Passenger route status failed:", error.message);
    return res.status(500).json({ message: "Unable to load route status." });
  }
});

app.get("/api/admin/assignments",
  authenticate,
  allowRoles("admin"),
  async (_req, res) => {
    try {
      const result = await query(`
        SELECT
          b.id AS bus_id,
          b.bus_number,
          b.status,
          r.id AS route_id,
          r.name AS route_name,
          u.id AS driver_id,
          u.name AS driver_name
        FROM buses b
        LEFT JOIN routes r ON r.id = b.route_id
        LEFT JOIN users u ON u.id = b.driver_id
        ORDER BY b.created_at DESC
      `);

      res.json({ assignments: result.rows });
    } catch (error) {
      console.error("Bus assignment list failed:", error.message);
      return res.status(500).json({ message: "Unable to load assignments." });
    }
  }
);

async function handleAdminBusAssignment(req, res) {
  try {
    const { busId, driverId, routeId } = req.body;

    if (!isValidUuid(busId) || !isValidUuid(driverId) || !isValidUuid(routeId)) {
      return res.status(400).json({ message: "Valid bus, driver and route IDs are required." });
    }

    const driverResult = await query(
      `SELECT id, role FROM users WHERE id = $1 AND role = 'driver'`,
      [driverId]
    );

    if (!driverResult.rows[0]) {
      return res.status(404).json({ message: "Driver not found or is not eligible." });
    }

    const routeResult = await query(
      `SELECT id FROM routes WHERE id = $1`,
      [routeId]
    );

    if (!routeResult.rows[0]) {
      return res.status(404).json({ message: "Route not found." });
    }

    const busResult = await query(
      `UPDATE buses
       SET driver_id = $1, route_id = $2, status = 'active', updated_at = NOW()
       WHERE id = $3
       RETURNING id, bus_number, driver_id, route_id, status`,
      [driverId, routeId, busId]
    );

    if (!busResult.rows[0]) {
      return res.status(404).json({ message: "Bus not found." });
    }

    return res.json({
      message: "Bus assignment updated successfully.",
      assignment: busResult.rows[0],
    });
  } catch (error) {
    console.error("Admin bus assignment failed:", error.message);
    return res.status(500).json({ message: "Unable to assign bus." });
  }
}

app.post("/api/admin/bus-assignment",
  authenticate,
  allowRoles("admin"),
  handleAdminBusAssignment
);

app.post("/api/admin/bus-assignments",
  authenticate,
  allowRoles("admin"),
  handleAdminBusAssignment
);

app.patch("/api/auth/role", authenticate, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['passenger', 'driver'].includes(role)) {
      return res.status(400).json({ message: "Role must be passenger or driver." });
    }

    const result = await query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, status`,
      [role, req.user.id]
    );

    const updatedUser = result.rows[0];

    return res.json({
      message: `Role updated to ${role}.`,
      user: updatedUser,
      token: createToken(updatedUser),
    });
  } catch (error) {
    console.error("Role update failed:", error.message);
    return res.status(500).json({ message: "Could not update your role." });
  }
});

app.put("/api/profile/verification", authenticate, async (req, res) => {
  try {
    const {
      phone,
      driverLicenseUrl,
      profilePhotoUrl,
      busPlateNumber,
      nidFrontUrl,
      nidBackUrl,
    } = req.body;

    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const sanitizedDriverLicenseUrl = typeof driverLicenseUrl === "string" ? driverLicenseUrl.trim() : null;
    const sanitizedProfilePhotoUrl = typeof profilePhotoUrl === "string" ? profilePhotoUrl.trim() : null;
    const sanitizedBusPlateNumber = typeof busPlateNumber === "string" ? busPlateNumber.trim() : null;
    const sanitizedNidFrontUrl = typeof nidFrontUrl === "string" ? nidFrontUrl.trim() : null;
    const sanitizedNidBackUrl = typeof nidBackUrl === "string" ? nidBackUrl.trim() : null;

    if (req.user.role === "driver") {
      if (
        normalizedPhone.length < 7 ||
        !sanitizedDriverLicenseUrl ||
        !sanitizedProfilePhotoUrl ||
        !sanitizedBusPlateNumber
      ) {
        return res.status(400).json({
          message: "Drivers must provide a valid phone number, profile photo, license image, and bus plate number.",
        });
      }
    }

    if (req.user.role === "passenger") {
      if (!sanitizedNidFrontUrl || !sanitizedNidBackUrl) {
        return res.status(400).json({
          message: "Passengers must upload both NID card images.",
        });
      }
    }

    const result = await query(
      `UPDATE users
       SET
         phone = COALESCE(NULLIF($1, ''), phone),
         profile_photo_url = COALESCE(NULLIF($2, ''), profile_photo_url),
         driver_license_url = COALESCE(NULLIF($3, ''), driver_license_url),
         bus_plate_number = COALESCE(NULLIF($4, ''), bus_plate_number),
         nid_front_url = COALESCE(NULLIF($5, ''), nid_front_url),
         nid_back_url = COALESCE(NULLIF($6, ''), nid_back_url),
         updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, email, role, status, phone, profile_photo_url, driver_license_url, bus_plate_number, nid_front_url, nid_back_url`,
      [
        normalizedPhone || null,
        sanitizedProfilePhotoUrl,
        sanitizedDriverLicenseUrl,
        sanitizedBusPlateNumber,
        sanitizedNidFrontUrl,
        sanitizedNidBackUrl,
        req.user.id,
      ]
    );

    return res.json({
      message: "Verification details saved successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Verification update failed:", error.message);
    return res.status(500).json({ message: "Could not save verification details." });
  }
});

app.get("/api/admin/users",
  authenticate,
  allowRoles("admin"),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT id, name, email, role, status, phone, created_at
         FROM users
         ORDER BY created_at DESC`
      );

      return res.json({ users: result.rows });
    } catch (error) {
      console.error("Admin user lookup failed:", error.message);
      return res.status(500).json({ message: "Could not load users." });
    }
  }
);

app.get("/api/admin/buses",
  authenticate,
  allowRoles("admin"),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT
           b.id,
           b.bus_number,
           b.registration_number,
           b.route_id,
           b.driver_id,
           b.status,
           b.created_at,
           b.updated_at,
           u.name AS driver_name,
           r.name AS route_name
         FROM buses b
         LEFT JOIN users u ON u.id = b.driver_id
         LEFT JOIN routes r ON r.id = b.route_id
         ORDER BY b.created_at DESC`
      );

      return res.json({ buses: result.rows });
    } catch (error) {
      console.error("Admin bus lookup failed:", error.message);
      return res.status(500).json({ message: "Could not load buses." });
    }
  }
);

app.post("/api/admin/buses",
  authenticate,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const {
        bus_name,
        bus_number,
        plate_number,
        registration_number,
        vehicle_type,
        capacity,
        status,
      } = req.body;

      const nextBusNumber = (bus_number || plate_number || bus_name || "BUS").toString().trim();
      const nextRegistrationNumber = (registration_number || "").toString().trim();
      const normalizedStatus = ["active", "inactive", "maintenance"].includes(status) ? status : "inactive";

      if (!nextBusNumber) {
        return res.status(400).json({ message: "A bus number, plate number, or bus name is required." });
      }

      const result = await query(
        `INSERT INTO buses (bus_number, registration_number, status)
         VALUES ($1, $2, $3)
         RETURNING id, bus_number, registration_number, status, created_at, updated_at`,
        [nextBusNumber, nextRegistrationNumber || null, normalizedStatus]
      );

      const bus = result.rows[0];

      return res.status(201).json({
        message: "Bus created successfully.",
        bus: { ...bus, bus_name: bus.bus_number },
      });
    } catch (error) {
      console.error("Admin bus create failed:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({ message: "A bus with that number already exists." });
      }

      return res.status(500).json({ message: "Could not create bus." });
    }
  }
);

app.get("/api/admin/routes",
  authenticate,
  allowRoles("admin"),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT id, name, start_location, end_location, is_active, created_at
         FROM routes
         ORDER BY created_at DESC`
      );

      return res.json({ routes: result.rows });
    } catch (error) {
      console.error("Admin route lookup failed:", error.message);
      return res.status(500).json({ message: "Could not load routes." });
    }
  }
);

app.post("/api/admin/routes",
  authenticate,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const route_name = (req.body.route_name || req.body.name || "").toString().trim();
      const start_location = (req.body.start_location || req.body.from || "").toString().trim();
      const end_location = (req.body.end_location || req.body.to || "").toString().trim();
      const distance_km = req.body.distance_km;
      const estimated_duration_min = req.body.estimated_duration_min;

      if (!route_name || !start_location || !end_location) {
        return res.status(400).json({ message: "Route name, start location, and end location are required." });
      }

      const result = await query(
        `INSERT INTO routes (name, start_location, end_location, is_active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id, name, start_location, end_location, is_active, created_at`,
        [route_name, start_location, end_location]
      );

      const route = result.rows[0];

      return res.status(201).json({
        message: "Route created successfully.",
        route: {
          ...route,
          route_name: route.name,
          distance_km: distance_km ?? null,
          estimated_duration_min: estimated_duration_min ?? null,
        },
      });
    } catch (error) {
      console.error("Admin route create failed:", error.message);
      return res.status(500).json({ message: "Could not create route." });
    }
  }
);

app.delete("/api/admin/users/:id",
  authenticate,
  allowRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    try {
      const result = await query(
        `DELETE FROM users
         WHERE id = $1
         RETURNING id, name, email, role, status`,
        [id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ message: "User not found." });
      }

      return res.json({
        message: "User account deleted permanently.",
        deletedUser: result.rows[0],
      });
    } catch (error) {
      console.error("User delete failed:", error.message);
      return res.status(500).json({ message: "Could not delete the user." });
    }
  }
);

app.get("/api/admin/overview",
  authenticate,
  allowRoles("admin"),
  async (_req, res) => {
    try {
      const result = await query(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS total_users,
          (SELECT COUNT(*)::int FROM users
            WHERE role = 'driver') AS total_drivers,
          (SELECT COUNT(*)::int FROM buses) AS total_buses,
          (SELECT COUNT(*)::int FROM routes
            WHERE is_active = TRUE) AS active_routes,
          (SELECT COUNT(*)::int FROM trips
            WHERE status = 'active') AS active_trips
      `);

      res.json({ overview: result.rows[0] });
    } catch {
      res.status(500).json({ message: "Could not load dashboard." });
    }
  }
);


const isValidUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);


  // Passenger: submit a request to become a driver
app.post(
  "/api/driver-requests",
  authenticate,
  allowRoles("passenger", "driver"),
  async (req, res) => {
    try {
      const result = await query(
        `INSERT INTO public.driver_requests (user_id)
         VALUES ($1)
         RETURNING id, status, requested_at`,
        [req.user.id]
      );

      return res.status(201).json({
        message: "Driver access request submitted successfully.",
        request: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "You already have a pending driver request.",
        });
      }

      console.error("Driver request failed:", error.message);

      return res.status(500).json({
        message: "Could not submit driver request.",
      });
    }
  }
);


// Passenger: view their own driver request history
app.get(
  "/api/driver-requests/me",
  authenticate,
  allowRoles("passenger", "driver"),
  async (req, res) => {
    try {
      const result = await query(
        `SELECT
           id,
           status,
           requested_at,
           reviewed_at,
           review_note
         FROM public.driver_requests
         WHERE user_id = $1
         ORDER BY requested_at DESC`,
        [req.user.id]
      );

      return res.json({ requests: result.rows });
    } catch (error) {
      console.error("Driver request history failed:", error.message);

      return res.status(500).json({
        message: "Could not load driver request history.",
      });
    }
  }
);

// Admin: view driver access requests
app.get(
  "/api/admin/driver-requests",
  authenticate,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const status = req.query.status || "pending";

      if (!["pending", "approved", "rejected", "all"].includes(status)) {
        return res.status(400).json({
          message: "Invalid request status.",
        });
      }

      const result = await query(
        `SELECT
           dr.id,
           dr.status,
           dr.requested_at,
           dr.reviewed_at,
           dr.review_note,
           u.id AS user_id,
           u.name,
           u.email,
           u.status AS user_status
         FROM public.driver_requests dr
         JOIN public.users u ON u.id = dr.user_id
         WHERE ($1 = 'all' OR dr.status = $1)
         ORDER BY
           CASE WHEN dr.status = 'pending' THEN 0 ELSE 1 END,
           dr.requested_at DESC`,
        [status]
      );

      return res.json({ requests: result.rows });
    } catch (error) {
      console.error("Admin driver requests failed:", error.message);

      return res.status(500).json({
        message: "Could not load driver requests.",
      });
    }
  }
);

// Admin: approve or reject a driver request
app.patch(
  "/api/admin/driver-requests/:id/review",
  authenticate,
  allowRoles("admin"),
  async (req, res) => {
    const { id } = req.params;
    const { decision, reviewNote = null } = req.body;

    if (!isValidUuid(id)) {
      return res.status(400).json({
        message: "Invalid driver request ID.",
      });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        message: "Decision must be approved or rejected.",
      });
    }

    if (
      reviewNote !== null &&
      (typeof reviewNote !== "string" || reviewNote.length > 500)
    ) {
      return res.status(400).json({
        message: "Review note must be 500 characters or fewer.",
      });
    }

    let client;

    try {
      client = await pool.connect();

      await client.query("BEGIN");

      const requestResult = await client.query(
        `SELECT
           dr.id,
           dr.user_id,
           dr.status,
           u.role,
           u.status AS user_status
         FROM public.driver_requests dr
         JOIN public.users u ON u.id = dr.user_id
         WHERE dr.id = $1
         FOR UPDATE OF dr, u`,
        [id]
      );

      const driverRequest = requestResult.rows[0];

      if (!driverRequest) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Driver request not found.",
        });
      }

      if (driverRequest.status !== "pending") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "This request has already been reviewed.",
        });
      }

      if (
        driverRequest.user_status !== "active" ||
        driverRequest.role !== "passenger"
      ) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "This account is not eligible for driver approval.",
        });
      }

      if (decision === "approved") {
        await client.query(
          `UPDATE public.users
           SET role = 'driver'
           WHERE id = $1`,
          [driverRequest.user_id]
        );
      }

      const updatedResult = await client.query(
        `UPDATE public.driver_requests
         SET
           status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           review_note = $3
         WHERE id = $4
         RETURNING id, user_id, status, reviewed_at, review_note`,
        [
          decision,
          req.user.id,
          reviewNote?.trim() || null,
          id,
        ]
      );

      await client.query("COMMIT");

      return res.json({
        message:
          decision === "approved"
            ? "Driver request approved successfully."
            : "Driver request rejected successfully.",
        request: updatedResult.rows[0],
      });
    } catch (error) {
      if (client) {
        await client.query("ROLLBACK").catch(() => {});
      }

      console.error("Driver request review failed:", error.message);

      return res.status(500).json({
        message: "Could not review driver request.",
      });
    } finally {
      client?.release();
    }
  }
);

// Driver: check the bus and route assigned to this account
app.get(
  "/api/driver/assignment",
  authenticate,
  allowRoles("driver"),
  async (req, res) => {
    try {
      const result = await query(
        `SELECT
           b.id AS bus_id,
           b.bus_number,
           b.route_id,
           r.name AS route_name,
           r.start_location,
           r.end_location
         FROM public.buses b
         JOIN public.routes r ON r.id = b.route_id
         WHERE b.driver_id = $1
           AND b.status = 'active'
           AND r.is_active = TRUE
         LIMIT 1`,
        [req.user.id]
      );

      res.json({ assignment: result.rows[0] ?? null });
    } catch (error) {
      console.error("Driver assignment failed:", error.message);
      res.status(500).json({ message: "Unable to load your bus assignment." });
    }
  }
);

// Driver: start a trip for their assigned bus
app.post(
  "/api/driver/trips/start",
  authenticate,
  allowRoles("driver"),
  async (req, res) => {
    try {
      const assignment = await query(
        `SELECT b.id AS bus_id, b.route_id
         FROM public.buses b
         JOIN public.routes r ON r.id = b.route_id
         WHERE b.driver_id = $1
           AND b.status = 'active'
           AND r.is_active = TRUE
         LIMIT 1`,
        [req.user.id]
      );

      if (!assignment.rows.length) {
        return res.status(400).json({
          message: "You need an active bus and route assignment before starting a trip.",
        });
      }

      const { bus_id, route_id } = assignment.rows[0];

      const existing = await query(
        `SELECT id FROM public.trips
         WHERE status = 'active'
           AND (driver_id = $1 OR bus_id = $2)
         LIMIT 1`,
        [req.user.id, bus_id]
      );

      if (existing.rows.length) {
        return res.status(409).json({
          message: "This driver or bus already has an active trip.",
        });
      }

      const result = await query(
        `INSERT INTO public.trips (bus_id, driver_id, route_id, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, bus_id, driver_id, route_id, status, started_at`,
        [bus_id, req.user.id, route_id]
      );

      res.status(201).json({
        message: "Trip started. You can now share your GPS location.",
        trip: result.rows[0],
      });
    } catch (error) {
      console.error("Start trip failed:", error.message);
      res.status(500).json({ message: "Unable to start trip." });
    }
  }
);

// Driver: report a GPS position for their own active trip
app.post(
  "/api/driver/trips/:tripId/location",
  authenticate,
  allowRoles("driver"),
  async (req, res) => {
    const { tripId } = req.params;
    const { latitude, longitude, speedKmh } = req.body;

    if (!isValidUuid(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID." });
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (speedKmh !== undefined &&
        (typeof speedKmh !== "number" ||
          !Number.isFinite(speedKmh) ||
          speedKmh < 0 ||
          speedKmh > 300))
    ) {
      return res.status(400).json({ message: "Invalid GPS coordinates or speed." });
    }

    try {
      const trip = await query(
        `SELECT id FROM public.trips
         WHERE id = $1 AND driver_id = $2 AND status = 'active'`,
        [tripId, req.user.id]
      );

      if (!trip.rows.length) {
        return res.status(403).json({
          message: "This is not your active trip.",
        });
      }

      const result = await query(
        `INSERT INTO public.bus_locations
           (trip_id, location, speed_kmh, recorded_at)
         VALUES (
           $1,
           extensions.ST_SetSRID(
             extensions.ST_MakePoint($2, $3),
             4326
           )::extensions.geography,
           $4,
           NOW()
         )
         RETURNING id, recorded_at`,
        [tripId, longitude, latitude, speedKmh ?? null]
      );

      const update = {
        tripId,
        latitude,
        longitude,
        speedKmh: speedKmh ?? null,
        recordedAt: result.rows[0].recorded_at,
      };

      io.emit("bus:location", update);

      res.status(201).json({
        message: "Location updated.",
        location: update,
      });
    } catch (error) {
      console.error("Save GPS location failed:", error.message);
      res.status(500).json({ message: "Unable to save GPS location." });
    }
  }
);

// Driver: finish their own trip
app.post(
  "/api/driver/trips/:tripId/finish",
  authenticate,
  allowRoles("driver"),
  async (req, res) => {
    const { tripId } = req.params;

    if (!isValidUuid(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID." });
    }

    try {
      const result = await query(
        `UPDATE public.trips
         SET status = 'completed', ended_at = NOW()
         WHERE id = $1
           AND driver_id = $2
           AND status = 'active'
         RETURNING id, status, ended_at`,
        [tripId, req.user.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          message: "No active trip found for this driver.",
        });
      }

      io.emit("bus:trip-ended", { tripId });

      res.json({
        message: "Trip finished successfully.",
        trip: result.rows[0],
      });
    } catch (error) {
      console.error("Finish trip failed:", error.message);
      res.status(500).json({ message: "Unable to finish trip." });
    }
  }
);

// Passenger: latest GPS positions from active trips
app.get("/api/buses/live", async (req, res) => {
  try {
    const result = await query(
      `SELECT
         t.id AS trip_id,
         b.bus_number,
         r.id AS route_id,
         r.name AS route_name,
         r.start_location,
         r.end_location,
         extensions.ST_Y(bl.location::extensions.geometry) AS latitude,
         extensions.ST_X(bl.location::extensions.geometry) AS longitude,
         bl.speed_kmh,
         bl.recorded_at
       FROM public.trips t
       JOIN public.buses b ON b.id = t.bus_id
       JOIN public.routes r ON r.id = t.route_id
       JOIN LATERAL (
         SELECT location, speed_kmh, recorded_at
         FROM public.bus_locations
         WHERE trip_id = t.id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) bl ON TRUE
       WHERE t.status = 'active'
         AND b.status = 'active'
         AND r.is_active = TRUE
         AND bl.recorded_at > NOW() - INTERVAL '2 minutes'
       ORDER BY bl.recorded_at DESC`
    );

    res.json({ buses: result.rows });
  } catch (error) {
    console.error("Live bus query failed:", error.message);
    res.status(500).json({ message: "Unable to load live bus locations." });
  }
});


io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
  });
});

const port = Number(process.env.PORT) || 3000;

try {
  await ensureDatabaseSchema();
  await ensureDefaultAdmin();
  console.log("Database schema check completed.");
} catch (error) {
  console.error("Database setup failed:", error.message);
  process.exit(1);
}

httpServer.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Close the running server or change PORT in the environment.`);
    process.exit(1);
  }

  console.error("Server failed to start:", error.message);
  process.exit(1);
});

httpServer.listen(port, () => {
  console.log(`Nepal Transit API running on http://localhost:${port}`);
});
