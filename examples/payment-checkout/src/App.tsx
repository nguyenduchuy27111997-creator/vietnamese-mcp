import { useState } from 'react'
import './App.css'

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string
const API_KEY = import.meta.env.VITE_API_KEY as string

type PaymentProvider = 'momo' | 'vnpay'

interface JsonRpcResponse {
  jsonrpc: string
  id: number
  result?: unknown
  error?: { code: number; message: string }
}

function App() {
  const [amount, setAmount] = useState(50000)
  const [orderInfo, setOrderInfo] = useState('Example payment')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<JsonRpcResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePay(provider: PaymentProvider) {
    setLoading(true)
    setResponse(null)
    setError(null)

    const endpoint = `${GATEWAY_URL}/mcp/${provider}`

    const body =
      provider === 'momo'
        ? {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'momo_create_payment',
              arguments: { amount, orderInfo },
            },
          }
        : {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'vnpay_create_payment_url',
              arguments: {
                amount,
                orderDescription: orderInfo,
                returnUrl: 'http://localhost:5173',
              },
            },
          }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = (await res.json()) as JsonRpcResponse
      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">VN MCP Payment Checkout</h1>
        <p className="subtitle">Example app using VN MCP Hub hosted gateway</p>

        <div className="form-group">
          <label htmlFor="amount">Amount (VND)</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={1000}
            step={1000}
          />
        </div>

        <div className="form-group">
          <label htmlFor="orderInfo">Order Description</label>
          <input
            id="orderInfo"
            type="text"
            value={orderInfo}
            onChange={(e) => setOrderInfo(e.target.value)}
            placeholder="Describe the order"
          />
        </div>

        <div className="button-group">
          <button
            className="btn btn-momo"
            onClick={() => handlePay('momo')}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Pay with MoMo'}
          </button>
          <button
            className="btn btn-vnpay"
            onClick={() => handlePay('vnpay')}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Pay with VNPAY'}
          </button>
        </div>

        {loading && <div className="spinner" aria-label="Loading" />}

        {error && <p className="error">{error}</p>}

        {response && (
          <pre className="response">{JSON.stringify(response, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

export default App
