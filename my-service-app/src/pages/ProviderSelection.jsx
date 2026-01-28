import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProviderSelection() {
  const navigate = useNavigate()

  const container = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at top, #065f46, #022c22)',
    padding: 20
  }

  const card = {
    width: '100%',
    maxWidth: 430,
    padding: 30,
    borderRadius: 20,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(52,211,153,0.4)',
    backdropFilter: 'blur(14px)',
    color: 'white'
  }

  const btn = (border) => ({
    width: '100%',
    padding: 20,
    margin: '16px 0',
    borderRadius: 16,
    border: `2px solid ${border}`,
    background: 'transparent',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 18
  })

  return (
    <div style={container}>
      <style>{`
        .flash{
          font-size:28px;
          animation: flash 1s infinite;
        }
        @keyframes flash{
          0%{transform:scale(1);opacity:1}
          50%{transform:scale(1.4);opacity:.4}
          100%{transform:scale(1);opacity:1}
        }

        .service-icons{
          position:relative;
          width:48px;
          height:48px;
        }
        .service-icons span{
          position:absolute;
          font-size:18px;
          opacity:0;
          transform:scale(.5);
          animation: appear .4s forwards;
        }

        .i1{top:0;left:50%;transform:translateX(-50%) scale(.5);animation-delay:.1s}
        .i2{right:0;top:50%;transform:translateY(-50%) scale(.5);animation-delay:.25s}
        .i3{bottom:0;left:50%;transform:translateX(-50%) scale(.5);animation-delay:.4s}
        .i4{left:0;top:50%;transform:translateY(-50%) scale(.5);animation-delay:.55s}
        .i5{top:8%;left:8%;animation-delay:.7s}
        .i6{bottom:8%;right:8%;animation-delay:.85s}

        @keyframes appear{
          to{opacity:1;transform:scale(1)}
        }

        .runner{
          font-size:26px;
          animation: run .8s infinite alternate;
        }
        @keyframes run{
          from{transform:translateX(0)}
          to{transform:translateX(8px)}
        }

        .label{font-size:1.1rem;font-weight:600}
        .desc{font-size:.85rem;opacity:.75}
      `}</style>

      <div style={card}>
        <h2 style={{ color: '#34d399', textAlign: 'center', marginBottom: 10 }}>
          Join as a Partner
        </h2>
        <p style={{ textAlign: 'center', opacity: .8, marginBottom: 26 }}>
          What type of service do you provide?
        </p>

        <button style={btn('#34d399')} onClick={() => navigate('/provider-dashboard')}>
          <div className="service-icons">
            <span className="i1">❄️</span>
            <span className="i2">🔧</span>
            <span className="i3">💡</span>
            <span className="i4">🛠️</span>
            <span className="i5">🔌</span>
            <span className="i6">🚿</span>
          </div>
          <div>
            <div className="label">General Service</div>
            <div className="desc">AC • Electrician • Plumbing • Repairs</div>
          </div>
        </button>

        <button style={btn('#f87171')} onClick={() => navigate('/instant-dashboard')}>
          <div className="flash">⚡</div>
          <div>
            <div className="label" style={{ color: '#fca5a5' }}>Instant Service</div>
            <div className="desc">Emergency & instant help</div>
          </div>
        </button>

        <button style={btn('#60a5fa')} onClick={() => navigate('/local-dashboard')}>
          <div className="runner">🏃‍♂️</div>
          <div>
            <div className="label" style={{ color: '#93c5fd' }}>Local Boys</div>
            <div className="desc">Fast nearby manual support</div>
          </div>
        </button>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#a7f3d0',
            marginTop: 22,
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
