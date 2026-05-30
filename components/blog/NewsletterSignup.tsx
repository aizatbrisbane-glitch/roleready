export function NewsletterSignup() {
  return (
    <section className="rounded-[2rem] bg-[#2200ff] px-6 py-10 text-white shadow-[0_24px_70px_rgba(34,0,255,0.18)] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Stay Ahead In Your Career</h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/80">
          Get practical job search and career advice delivered to your inbox.
        </p>
        <form className="mx-auto mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="newsletter-email">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            placeholder="Email address"
            className="min-h-12 flex-1 rounded-full border border-white/20 bg-white px-5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-white/25"
          />
          <button type="button" className="min-h-12 rounded-full bg-[#c8ff00] px-6 text-sm font-bold text-slate-900 shadow-[0_12px_28px_rgba(200,255,0,0.3)] transition hover:-translate-y-0.5">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
