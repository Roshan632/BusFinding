
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 sm:p-10">
        <h1 className="text-3xl font-bold text-slate-900">
          Terms and Conditions
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Nepal Transit · Please read before creating an account.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <section>
            <h2 className="font-bold text-slate-900">1. Using the service</h2>
            <p>
              Nepal Transit provides public transport route information and,
              where available, bus location and estimated arrival information.
              Users must provide accurate account details and use the service
              lawfully.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">2. Location permissions</h2>
            <p>
              Drivers may choose to share their device location during an
              authorized trip. Location access requires browser permission.
              Drivers should stop sharing when the trip ends.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">3. Location accuracy</h2>
            <p>
              GPS reports may be delayed, inaccurate or unavailable. Arrival
              estimates are approximate and must not be treated as guarantees.
              Always follow road safety rules and official transport guidance.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">4. Account responsibilities</h2>
            <p>
              Users must protect their login credentials. Driver access requires
              appropriate authorization. Choosing a driver option does not
              itself grant permission to operate or track a bus.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">5. Privacy</h2>
            <p>
              Location data should be collected only for the platform's stated
              tracking purposes and handled according to the applicable privacy
              policy and laws. Review the platform's final privacy policy before
              using the production service.
            </p>
          </section>
        </div>

        <Link
          to="/register"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Return to registration
        </Link>
      </article>
    </main>
  );
}
