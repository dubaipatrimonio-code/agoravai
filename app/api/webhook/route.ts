import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Webhook recebido:", body)

    // Aqui você pode processar o webhook conforme necessário
    // Por exemplo: atualizar status no banco de dados, enviar emails, etc.

    const { id, external_id, status, total_amount, payment_method } = body

    // Exemplo de processamento baseado no status
    switch (status) {
      case "AUTHORIZED":
        console.log(`Pagamento aprovado para transação ${id}`)
        // Processar aprovação do pagamento
        break
      case "FAILED":
        console.log(`Pagamento falhou para transação ${id}`)
        // Processar falha do pagamento
        break
      case "CHARGEBACK":
        console.log(`Chargeback para transação ${id}`)
        // Processar chargeback
        break
      default:
        console.log(`Status ${status} para transação ${id}`)
    }

    // Sempre retornar 200 para confirmar recebimento
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Erro ao processar webhook:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }
}
