import { applyActionCode, getAuth } from "firebase/auth";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");

  const verifyEmail = () => {
    setStatus("loading");
    const oobCode = searchParams.get("oobCode");
    if (!oobCode) { setStatus("error"); return; }

    applyActionCode(getAuth(), oobCode)
      .then(() => setStatus("success"))
      .catch((err) => { console.error(err); setStatus("error"); });
  };

  const styles = { 
    container: { height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#04080D', color:'#D8E8F2', fontFamily:'DM Sans,sans-serif' },
    card: { background:'#080F18', padding:40, borderRadius:16, border:'1px solid #162130', textAlign:'center' as const }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === "pending" && (
          <div>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <h2>Verify Your Email</h2>
            <p style={{ color:'#5E7A8E', marginTop:8 }}>Click the button below to confirm your account.</p>
            <button onClick={verifyEmail} style={{ marginTop:20, padding:'12px 32px', background:'#00E5A0', color:'#000', borderRadius:8, fontWeight:700, border:'none', cursor:'pointer', fontSize: 16 }}>Verify Now</button>
          </div>
        )}
        {status === "loading" && <h2>Verifying your email…</h2>}
        {status === "success" && (
          <div>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h2>Email Verified!</h2>
            <p style={{ color:'#5E7A8E', marginTop:8 }}>You can now log in to your SEVA account.</p>
            <a href="/" style={{ display:'inline-block', marginTop:20, padding:'10px 24px', background:'#00E5A0', color:'#000', borderRadius:8, fontWeight:700, textDecoration:'none' }}>Go to App →</a>
          </div>
        )}
        {status === "error" && (
          <div>
            <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
            <h2>Link Expired or Already Used</h2>
            <p style={{ color:'#5E7A8E', marginTop:8 }}>Please sign up again or use the resend button in the app.</p>
            <a href="/" style={{ display:'inline-block', marginTop:20, padding:'10px 24px', background:'#162130', color:'#D8E8F2', borderRadius:8, textDecoration:'none' }}>← Back</a>
          </div>
        )}
      </div>
    </div>
  );
}
