export default function UnsubscribeConfirmedPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "80px auto", padding: "0 24px", color: "#1e293b" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>You've been unsubscribed</h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#475569", marginBottom: 16 }}>
        You'll no longer receive job search reminder emails from Koalapply.
      </p>
      <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
        This does not affect password reset emails, receipts, or the Koalapply newsletter
        if you subscribed separately. You can re-enable reminders from your account settings
        at any time.
      </p>
    </main>
  );
}
