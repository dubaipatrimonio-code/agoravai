"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import PixPayment from "./pix-payment"

export default function BurglCheckout() {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    addressType: "casa",
    embalagem: false,
    doces: false,
  })

  const [showAddressFields, setShowAddressFields] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({})
  const numeroRef = useRef<HTMLInputElement>(null)

  const applyMask = (value: string, type: string) => {
    const numbers = value.replace(/\D/g, "")

    switch (type) {
      case "telefone":
        if (numbers.length > 11) return numbers.slice(0, 11)
        return numbers.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{4,5})(\d{4})$/, "$1-$2")
      case "cpf":
        if (numbers.length > 11) return numbers.slice(0, 11)
        return numbers
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      case "cep":
        if (numbers.length > 8) return numbers.slice(0, 8)
        return numbers.replace(/(\d{5})(\d)/, "$1-$2")
      default:
        return value
    }
  }

  const handleCepChange = async (value: string) => {
    const maskedValue = applyMask(value, "cep")
    updateFormData("cep", maskedValue)

    const cep = maskedValue.replace(/\D/g, "")
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            rua: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
          }))
          setShowAddressFields(true)
          setTimeout(() => {
            numeroRef.current?.focus()
          }, 100)
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error)
      }
    }
  }

  const validateAndHighlightFields = () => {
    const errors: { [key: string]: boolean } = {}
    let hasErrors = false
    let firstErrorField = ""

    if (!formData.nome.trim()) {
      errors.nome = true
      hasErrors = true
      if (!firstErrorField) firstErrorField = "nome"
    }
    if (!formData.telefone.trim()) {
      errors.telefone = true
      hasErrors = true
      if (!firstErrorField) firstErrorField = "telefone"
    }
    if (!formData.cpf.trim()) {
      errors.cpf = true
      hasErrors = true
      if (!firstErrorField) firstErrorField = "cpf"
    }
    if (showAddressFields && !formData.numero.trim()) {
      errors.numero = true
      hasErrors = true
      if (!firstErrorField) firstErrorField = "numero"
    }

    setFieldErrors(errors)

    if (hasErrors && firstErrorField) {
      setTimeout(() => {
        const element = document.getElementById(firstErrorField)
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
          element.focus()
        }
      }, 100)
    }

    return !hasErrors
  }

  const handlePayment = async () => {
    if (!validateAndHighlightFields()) {
      return
    }

    console.log("[v0] Iniciando processo de pagamento...")
    setLoading(true)

    if (typeof window !== "undefined" && window.trackAddPaymentInfo) {
      window.trackAddPaymentInfo()
    }

    try {
      console.log("[v0] Preparando dados do pedido...")
      const startTime = Date.now()

      const externalId = `burgl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const customerData: any = {
        name: formData.nome,
        email: `${formData.telefone.replace(/\D/g, "")}@temp.com`,
        phone: formData.telefone.replace(/\D/g, ""),
      }

      const cpfToUse = formData.cpf?.trim()

      if (cpfToUse) {
        const cleanCpf = cpfToUse.replace(/\D/g, "")
        if (cleanCpf.length > 0) {
          customerData.document = cleanCpf
          customerData.document_type = cleanCpf.length === 11 ? "CPF" : "CNPJ"
        }
      }

      const orderData = {
        external_id: externalId,
        total_amount: total,
        payment_method: "pix",
        webhook_url: `${window.location.origin}/api/webhook`,
        customer: customerData,
        items: [
          {
            name: "Lançamento Abrão - Facebook Ads", // Changed product name from "Nome Bac Em Dobro" to "Lançamento Abrão - Facebook Ads"
            quantity: 1,
            price: 32.9,
          },
        ],
      }

      if (formData.embalagem) {
        orderData.items.push({
          name: "Embalagem para Surpresa",
          quantity: 1,
          price: 1,
        })
      }

      if (formData.doces) {
        orderData.items.push({
          name: "Doces Fini e Sachês",
          quantity: 1,
          price: 1,
        })
      }

      console.log("[v0] Enviando para API...", Date.now() - startTime, "ms")

      const response = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      console.log("[v0] Resposta da API recebida:", Date.now() - startTime, "ms")

      const result = await response.json()

      if (!result.hasError && result.id) {
        console.log("[v0] PIX gerado com sucesso:", Date.now() - startTime, "ms")

        if (typeof window !== "undefined" && window.trackPurchase) {
          window.trackPurchase(total, result.id)
        }

        setTransaction(result)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        console.log("[v0] Erro na API:", result)
        alert("Erro ao processar pagamento: " + (result.message || result.error || "Erro desconhecido"))
      }
    } catch (error) {
      console.error("[v0] Erro no processo:", error)
      alert("Erro ao processar pagamento")
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const total = 32.9 + (formData.embalagem ? 1 : 0) + (formData.doces ? 1 : 0)

  if (transaction) {
    return <PixPayment pixData={transaction} totalAmount={total} />
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F3EB", fontFamily: "Roboto, sans-serif" }}>
      {/* Header */}
      <header
        className="flex items-center p-5 text-white font-bold text-xl border-b border-gray-200 justify-start"
        style={{ backgroundColor: "#C49D5D" }}
      >
        <span>←</span>
        <span className="ml-2">Burgl Delivery</span>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* Resumo do Pedido */}
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-4 font-semibold" style={{ color: "#C49D5D" }}>
            Seu Pedido:
          </h2>
          <div className="flex gap-3 items-start mb-2">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-3C6zbWmvsWV6Tjzt9D7MaHeQH0ZZwd.png"
              alt="Lançamento Abrão - Facebook Ads" // Updated alt text to match new product name
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <p className="font-bold">2X Burgl Bacon Em Dobro</p>
              <p className="text-sm text-gray-600">Inclusos: 2x Fritas, 2x Bebidas</p>
              <span
                className="text-xs text-gray-500 underline cursor-pointer inline-block mt-1"
                onClick={() => setShowDetails(!showDetails)}
              >
                Detalhes do Pedido
              </span>
              {showDetails && (
                <div className="text-xs text-gray-600 mt-1">
                  <p>Ingredientes: Pão, Hambúrguer, Queijo, Alface, Molho Especial.</p>
                  <p>Observações: Sem cebola.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Cliente */}
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-4 font-semibold" style={{ color: "#C49D5D" }}>
            Informações do Cliente
          </h2>

          <Label htmlFor="nome" className="font-medium text-black text-sm block mb-1">
            Nome
          </Label>
          <Input
            id="nome"
            placeholder="Seu nome"
            value={formData.nome}
            onChange={(e) => {
              updateFormData("nome", e.target.value)
              if (fieldErrors.nome) {
                setFieldErrors((prev) => ({ ...prev, nome: false }))
              }
            }}
            className={`w-full mb-4 border rounded-lg text-black ${
              fieldErrors.nome ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            style={{
              backgroundColor: fieldErrors.nome ? "#FEF2F2" : "#FDFCFB",
              padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
            }}
          />

          <Label htmlFor="telefone" className="font-medium text-black text-sm block mb-1">
            WhatsaApp para contato
          </Label>
          <Input
            id="telefone"
            placeholder="(00) 0000-0000"
            value={formData.telefone}
            onChange={(e) => {
              updateFormData("telefone", applyMask(e.target.value, "telefone"))
              if (fieldErrors.telefone) {
                setFieldErrors((prev) => ({ ...prev, telefone: false }))
              }
            }}
            className={`w-full mb-4 border rounded-lg text-black ${
              fieldErrors.telefone ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            style={{
              backgroundColor: fieldErrors.telefone ? "#FEF2F2" : "#FDFCFB",
              padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
            }}
          />

          <Label htmlFor="cpf" className="font-medium text-black text-sm block mb-1">
            CPF
          </Label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            value={formData.cpf}
            onChange={(e) => {
              updateFormData("cpf", applyMask(e.target.value, "cpf"))
              if (fieldErrors.cpf) {
                setFieldErrors((prev) => ({ ...prev, cpf: false }))
              }
            }}
            className={`w-full mb-4 border rounded-lg text-black ${
              fieldErrors.cpf ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            style={{
              backgroundColor: fieldErrors.cpf ? "#FEF2F2" : "#FDFCFB",
              padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
            }}
          />
        </div>

        {/* Endereço */}
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-4 font-semibold" style={{ color: "#C49D5D" }}>
            Endereço
          </h2>

          <Label htmlFor="cep" className="font-medium text-black text-sm block mb-1">
            CEP
          </Label>
          <Input
            id="cep"
            placeholder="00000-000"
            value={formData.cep}
            onChange={(e) => handleCepChange(e.target.value)}
            className="w-full mb-4 border border-gray-300 rounded-lg text-black"
            style={{
              backgroundColor: "#FDFCFB",
              padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
            }}
          />

          {showAddressFields && (
            <div>
              <Label htmlFor="rua" className="font-medium text-black text-sm block mb-1">
                Rua
              </Label>
              <Input
                id="rua"
                placeholder="Nome da rua"
                value={formData.rua}
                onChange={(e) => updateFormData("rua", e.target.value)}
                className="w-full mb-4 border border-gray-300 rounded-lg text-black"
                style={{
                  backgroundColor: "#FDFCFB",
                  padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
                }}
              />

              <Label htmlFor="numero" className="font-medium text-black text-sm block mb-1">
                Número *
              </Label>
              <Input
                ref={numeroRef}
                id="numero"
                placeholder="Número da residência"
                value={formData.numero}
                onChange={(e) => {
                  updateFormData("numero", e.target.value)
                  if (fieldErrors.numero) {
                    setFieldErrors((prev) => ({ ...prev, numero: false }))
                  }
                }}
                className={`w-full mb-4 border rounded-lg text-black ${
                  fieldErrors.numero ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                style={{
                  backgroundColor: fieldErrors.numero ? "#FEF2F2" : "#FDFCFB",
                  padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
                }}
                required
              />

              <Label htmlFor="bairro" className="font-medium text-black text-sm block mb-1">
                Bairro
              </Label>
              <Input
                id="bairro"
                placeholder="Digite o bairro"
                value={formData.bairro}
                onChange={(e) => updateFormData("bairro", e.target.value)}
                className="w-full mb-4 border border-gray-300 rounded-lg text-black"
                style={{
                  backgroundColor: "#FDFCFB",
                  padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
                }}
              />

              <Label htmlFor="cidade" className="font-medium text-black text-sm block mb-1">
                Cidade
              </Label>
              <Input
                id="cidade"
                placeholder="Cidade"
                value={formData.cidade}
                onChange={(e) => updateFormData("cidade", e.target.value)}
                className="w-full mb-4 border border-gray-300 rounded-lg text-black"
                style={{
                  backgroundColor: "#FDFCFB",
                  padding: "12px 16px", // Set custom padding to 12px vertical and 16px horizontal
                }}
              />

              <div className="flex gap-2 mt-3">
                <Button
                  variant={formData.addressType === "casa" ? "default" : "outline"}
                  onClick={() => updateFormData("addressType", "casa")}
                  className="flex-1 p-3 border border-gray-800 rounded-lg font-medium text-sm"
                  style={{
                    backgroundColor: formData.addressType === "casa" ? "#C49D5D" : "transparent",
                    color: formData.addressType === "casa" ? "white" : "#C49D5D",
                    borderColor: "#C49D5D",
                  }}
                >
                  Casa
                </Button>
                <Button
                  variant={formData.addressType === "trabalho" ? "default" : "outline"}
                  onClick={() => updateFormData("addressType", "trabalho")}
                  className="flex-1 p-3 border border-gray-800 rounded-lg font-medium text-sm"
                  style={{
                    backgroundColor: formData.addressType === "trabalho" ? "#C49D5D" : "transparent",
                    color: formData.addressType === "trabalho" ? "white" : "#C49D5D",
                    borderColor: "#C49D5D",
                  }}
                >
                  Trabalho
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Forma de Pagamento */}
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-4 font-semibold" style={{ color: "#C49D5D" }}>
            Forma de Pagamento
          </h2>
          <div
            className="p-4 rounded-lg font-bold"
            style={{ backgroundColor: "rgba(76, 175, 80, 0.15)", color: "#1B5E20" }}
          >
            <label className="flex items-center">
              <input type="radio" name="pagamento" checked readOnly className="mr-2" />
              Pix - pagamento instantâneo
            </label>
          </div>
        </div>

        {/* Order Bumps */}
        <div className="mb-5 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-4 font-semibold" style={{ color: "#C49D5D" }}>
            Adicione ao seu pedido
          </h2>

          <label
            className="flex items-center p-3 rounded-lg mb-2 text-sm border border-gray-300 hover:border-gray-400 cursor-pointer transition-colors"
            style={{ backgroundColor: "#F8F3EB" }}
          >
            <Checkbox
              checked={formData.embalagem}
              onCheckedChange={(checked) => updateFormData("embalagem", checked)}
              className="mr-2 w-5 h-5 border-2 border-gray-400 data-[state=checked]:bg-[#C49D5D] data-[state=checked]:border-[#C49D5D]"
            />
            Embalagem para Surpresa (GRÁTIS)
          </label>

          <label
            className="flex items-center p-3 rounded-lg text-sm border border-gray-300 hover:border-gray-400 cursor-pointer transition-colors"
            style={{ backgroundColor: "#F8F3EB" }}
          >
            <Checkbox
              checked={formData.doces}
              onCheckedChange={(checked) => updateFormData("doces", checked)}
              className="mr-2 w-5 h-5 border-2 border-gray-400 data-[state=checked]:bg-[#C49D5D] data-[state=checked]:border-[#C49D5D]"
            />
            Doces Fini e Sachês (GRÁTIS)
          </label>
        </div>

        {/* Nota Fiscal */}
        <div
          className="p-5 rounded-lg border border-dashed mb-5"
          style={{ backgroundColor: "#FFF9F3", borderColor: "#C49D5D", fontFamily: "Courier New, Courier, monospace" }}
        >
          <h3 className="text-center mb-3 font-semibold" style={{ color: "#C49D5D" }}>
            Pedido: #213
          </h3>
          <p>Pedido: 2X Burgl Bacon Em Dobro</p>
          <p>Nome: {formData.nome || "-"}</p>
          <p>Telefone: {formData.telefone || "-"}</p>
          <p>CPF: {formData.cpf || "-"}</p>
          <p>
            Endereço:{" "}
            {formData.rua && formData.numero ? `${formData.rua}, ${formData.numero} - ${formData.bairro}` : "-"}
          </p>
          <p>Cidade: {formData.cidade || "-"}</p>
          {(formData.embalagem || formData.doces) && (
            <p>
              Extras:{" "}
              {[formData.embalagem && "Embalagem Surpresa", formData.doces && "Doces Fini e Sachês"]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <p>
            <strong>Entrega em: 30/50 min</strong>
          </p>
          <p>
            <strong>Total: R$ {total.toFixed(2).replace(".", ",")}</strong>
          </p>
        </div>

        {/* Botão Final */}
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full p-6 rounded-xl text-lg font-bold text-white mt-2"
          style={{ backgroundColor: "#22C55E" }}
        >
          {loading ? "Processando..." : "Finalizar Pedido"}
        </Button>
      </div>
    </div>
  )
}
