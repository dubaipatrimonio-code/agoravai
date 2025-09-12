"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Copy, CheckCircle, Clock, RefreshCw, Check } from "lucide-react"
import QRCode from "qrcode"

interface PixPaymentProps {
  pixData: {
    id: string
    external_id: string
    status: string
    total_value: number
    pix: {
      payload: string
    }
    customer: {
      name: string
      email: string
    }
  }
  totalAmount: number
}

const PixPayment = ({ pixData, totalAmount }: PixPaymentProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [paymentStatus, setPaymentStatus] = useState(pixData.status)
  const [isChecking, setIsChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    QRCode.toDataURL(pixData.pix.payload, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }).then(setQrCodeUrl)

    const interval = setInterval(checkPaymentStatus, 5000)

    return () => clearInterval(interval)
  }, [pixData.id])

  const checkPaymentStatus = async () => {
    if (paymentStatus === "AUTHORIZED") return

    setIsChecking(true)
    try {
      const response = await fetch(`/api/check-transaction/${pixData.id}`)
      const data = await response.json()

      if (data.status !== paymentStatus) {
        setPaymentStatus(data.status)

        if (data.status === "AUTHORIZED") {
          toast({
            title: "Pagamento aprovado!",
            description: "Seu pagamento foi processado com sucesso.",
          })
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error)
    } finally {
      setIsChecking(false)
    }
  }

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixData.pix.payload)
      setCopied(true)
      toast({
        title: "Chave PIX copiada!",
        description: "Cole no seu app do banco para pagar",
      })
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente",
        variant: "destructive",
      })
    }
  }

  if (paymentStatus === "AUTHORIZED") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F8F3EB", fontFamily: "Roboto, sans-serif" }}>
        <header
          className="flex items-center p-5 text-white font-bold text-xl border-b border-gray-200 justify-start"
          style={{ backgroundColor: "#C49D5D" }}
        >
          <span>←</span>
          <span className="ml-2">Burgl Delivery</span>
        </header>

        <div className="max-w-3xl mx-auto p-6">
          <div className="mb-5 bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
            <div
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "rgba(76, 175, 80, 0.15)" }}
            >
              <CheckCircle className="h-12 w-12" style={{ color: "#22C55E" }} />
            </div>
            <h2 className="text-2xl mb-4 font-bold" style={{ color: "#C49D5D" }}>
              Pagamento Aprovado!
            </h2>
            <p className="text-gray-600 mb-6">
              Seu pagamento de <strong>R$ {totalAmount.toFixed(2).replace(".", ",")}</strong> foi processado com
              sucesso.
            </p>
            <div
              className="p-4 rounded-lg border border-dashed mb-6"
              style={{ backgroundColor: "#FFF9F3", borderColor: "#C49D5D" }}
            >
              <p className="text-sm mb-2">
                <strong>ID da Transação:</strong> {pixData.id}
              </p>
              <p className="text-sm">
                <strong>Cliente:</strong> {pixData.customer.name}
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="w-full p-6 rounded-xl text-lg font-bold text-white"
              style={{ backgroundColor: "#22C55E" }}
            >
              Fazer Nova Compra
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F3EB", fontFamily: "Roboto, sans-serif" }}>
      <header
        className="flex items-center p-5 text-white font-bold text-xl border-b border-gray-200 justify-start"
        style={{ backgroundColor: "#C49D5D" }}
      >
        <span>←</span>
        <span className="ml-2">Burgl Delivery</span>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="h-5 w-5" style={{ color: "#F57C00" }} />
            <h2 className="text-lg font-semibold" style={{ color: "#F57C00" }}>
              Aguardando pagamento
            </h2>
          </div>

          <div className="bg-white p-4 rounded-lg inline-block shadow-sm border border-gray-200 mb-4">
            {qrCodeUrl ? (
              <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code PIX" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 bg-gray-100 animate-pulse rounded flex items-center justify-center">
                <span className="text-gray-400">Gerando QR Code...</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-xs mx-auto">
            <Button
              onClick={copyPixCode}
              className="w-full px-4 py-3 rounded-lg font-medium text-sm"
              style={{
                backgroundColor: copied ? "#22C55E" : "#2563EB",
                color: "white",
                transition: "all 0.3s ease",
              }}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Chave PIX copiada!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Pix (Copia e Cola)
                </>
              )}
            </Button>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Total: <strong>R$ {totalAmount.toFixed(2).replace(".", ",")}</strong>
          </p>
        </div>

        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-lg mb-3 font-semibold" style={{ color: "#C49D5D" }}>
            Instruções de Pagamento PIX Copia e Cola
          </h3>
          <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: "rgba(33, 150, 243, 0.1)" }}>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Abra o app do seu banco ou carteira digital</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Escolha a opção "PIX Copia e Cola" ou "Pagar com PIX"</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Cole o código copiado ou escaneie o QR Code acima</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>Confirme os dados e finalize o pagamento</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-lg mb-4 font-semibold" style={{ color: "#C49D5D" }}>
            Detalhes do Pedido
          </h3>
          <div className="flex gap-3 items-start mb-4">
            <img
              src="/classic-hamburger.png"
              alt="Lançamento Abrão - Facebook Ads"
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1">
              <p className="font-bold">2X Burgl Bacon Em Dobro</p>
              <p className="text-sm text-gray-600">Inclusos: 2x Fritas, 2x Bebidas</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span className="font-medium">{pixData.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span>ID da Transação:</span>
              <span className="font-mono text-xs">{pixData.id}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span style={{ color: "#C49D5D" }}>R$ {totalAmount.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status check section */}
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold" style={{ color: "#C49D5D" }}>
              Status do Pagamento
            </h3>
            <Button
              onClick={checkPaymentStatus}
              variant="outline"
              size="sm"
              disabled={isChecking}
              className="border-gray-300 bg-transparent"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            O status será atualizado automaticamente quando o pagamento for confirmado.
          </p>
        </div>

        <div
          className="p-4 rounded-lg border border-dashed"
          style={{ backgroundColor: "#FFF9F3", borderColor: "#C49D5D" }}
        >
          <p className="text-center text-sm" style={{ color: "#C49D5D" }}>
            <strong>⏱️ Entrega em 30-50 minutos após confirmação do pagamento</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PixPayment
