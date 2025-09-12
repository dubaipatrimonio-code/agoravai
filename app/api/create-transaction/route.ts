import { type NextRequest, NextResponse } from "next/server"

const LIRAPAY_API_SECRET = process.env.LIRAPAY_API_SECRET
const LIRAPAY_BASE_URL = "https://api.lirapaybr.com"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Iniciando processamento...")
    const startTime = Date.now()

    if (!LIRAPAY_API_SECRET) {
      return NextResponse.json({ hasError: true, message: "API Secret não configurado" }, { status: 500 })
    }

    const body = await request.json()
    console.log("[v0] API: Dados recebidos:", Date.now() - startTime, "ms")

    const requiredFields = ["external_id", "total_amount", "payment_method", "webhook_url", "items", "customer"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ hasError: true, message: `Campo obrigatório: ${field}` }, { status: 400 })
      }
    }

    const customerData: any = {
      name: body.customer.name,
      email: body.customer.email,
      phone: body.customer.phone,
    }

    if (body.customer.document && body.customer.document.trim()) {
      const cleanDocument = body.customer.document.replace(/[^\d]/g, "")
      if (cleanDocument.length > 0) {
        customerData.document = cleanDocument
        customerData.document_type = cleanDocument.length <= 11 ? "CPF" : "CNPJ"
      }
    }

    const transformedData = {
      external_id: body.external_id,
      total_amount: body.total_amount,
      payment_method: "PIX",
      webhook_url: body.webhook_url,
      ip: "127.0.0.1",
      customer: customerData,
      items: body.items.map((item: any, index: number) => ({
        id: `item_${index + 1}`,
        title: item.name || `Item ${index + 1}`,
        description: item.description || item.name || `Descrição do item ${index + 1}`,
        quantity: item.quantity || 1,
        price: item.price,
        is_physical: false,
      })),
    }

    console.log("[v0] API: Enviando para LiraPay...", Date.now() - startTime, "ms")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

    const response = await fetch(`${LIRAPAY_BASE_URL}/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-secret": LIRAPAY_API_SECRET,
      },
      body: JSON.stringify(transformedData),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    console.log("[v0] API: Resposta LiraPay recebida:", Date.now() - startTime, "ms")

    const data = await response.json()

    if (!response.ok || data.hasError) {
      console.log("[v0] API: Erro na resposta:", data)
      let errorMessage = "Erro ao processar pagamento"

      if (data.errorFields && data.errorFields.length > 0) {
        const fieldErrors = data.errorFields.join(", ")
        errorMessage = `Erro de validação: ${fieldErrors}`
      } else if (data.error) {
        errorMessage = data.error
      }

      return NextResponse.json(
        { hasError: true, message: errorMessage, details: data },
        { status: response.status || 400 },
      )
    }

    console.log("[v0] API: Processamento concluído:", Date.now() - startTime, "ms")
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[v0] API: Timeout na chamada LiraPay")
      return NextResponse.json(
        { hasError: true, message: "Timeout na comunicação com o servidor de pagamentos" },
        { status: 408 },
      )
    }

    console.error("[v0] API: Erro:", error)
    return NextResponse.json(
      {
        hasError: true,
        message: "Erro interno do servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
