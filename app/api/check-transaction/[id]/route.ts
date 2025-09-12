import { type NextRequest, NextResponse } from "next/server"

const LIRAPAY_API_SECRET = process.env.LIRAPAY_API_SECRET
const LIRAPAY_BASE_URL = "https://api.lirapaybr.com"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!LIRAPAY_API_SECRET) {
      return NextResponse.json({ hasError: true, message: "API Secret não configurado" }, { status: 500 })
    }

    const { id } = params

    const response = await fetch(`${LIRAPAY_BASE_URL}/v1/transactions/${id}`, {
      method: "GET",
      headers: {
        "api-secret": LIRAPAY_API_SECRET,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { hasError: true, message: data.message || "Erro ao consultar transação" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro ao consultar transação:", error)
    return NextResponse.json({ hasError: true, message: "Erro interno do servidor" }, { status: 500 })
  }
}
