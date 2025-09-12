"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CreditCard, Shield, Clock } from "lucide-react"
import PixPayment from "./pix-payment"

interface CheckoutItem {
  id: string
  title: string
  description: string
  price: number
  quantity: number
  is_physical: boolean
}

interface CustomerData {
  name: string
  email: string
  phone: string
  document: string
  document_type: "CPF" | "CNPJ"
}

const defaultItems: CheckoutItem[] = [
  {
    id: "1",
    title: "Produto Exemplo",
    description: "Descrição do produto exemplo",
    price: 99.9,
    quantity: 1,
    is_physical: false,
  },
]

export function CheckoutForm() {
  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    email: "",
    phone: "",
    document: "",
    document_type: "CPF",
  })
  const [items, setItems] = useState<CheckoutItem[]>(defaultItems)
  const [isLoading, setIsLoading] = useState(false)
  const [pixData, setPixData] = useState<any>(null)
  const { toast } = useToast()

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    if (field === "document") {
      // Remove formatação (pontos, traços, barras)
      const cleanDocument = value.replace(/[^\d]/g, "")

      // Auto-detecta o tipo baseado no número de dígitos
      const documentType = cleanDocument.length <= 11 ? "CPF" : "CNPJ"

      setCustomer((prev) => ({
        ...prev,
        document: cleanDocument,
        document_type: documentType,
      }))
    } else {
      setCustomer((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleItemChange = (index: number, field: keyof CheckoutItem, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: "",
        description: "",
        price: 0,
        quantity: 1,
        is_physical: false,
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    if (!customer.name || !customer.email || !customer.phone || !customer.document) {
      toast({
        title: "Erro de validação",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return false
    }

    const docLength = customer.document.length
    if (customer.document_type === "CPF" && docLength !== 11) {
      toast({
        title: "CPF inválido",
        description: "CPF deve ter 11 dígitos",
        variant: "destructive",
      })
      return false
    }

    if (customer.document_type === "CNPJ" && docLength !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "CNPJ deve ter 14 dígitos",
        variant: "destructive",
      })
      return false
    }

    if (items.some((item) => !item.title || item.price <= 0)) {
      toast({
        title: "Erro de validação",
        description: "Todos os itens devem ter título e preço válidos",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: `checkout_${Date.now()}`,
          total_amount: totalAmount,
          payment_method: "PIX",
          webhook_url: `${window.location.origin}/api/webhook`,
          items,
          ip: "127.0.0.1", // Em produção, obter o IP real do cliente
          customer,
        }),
      })

      const data = await response.json()

      if (data.hasError) {
        throw new Error(data.message || "Erro ao criar transação")
      }

      setPixData(data)
      toast({
        title: "Transação criada!",
        description: "Use o QR Code ou código PIX para pagar",
      })
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro ao processar pagamento",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (pixData) {
    return <PixPayment pixData={pixData} totalAmount={totalAmount} />
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Formulário de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={customer.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="João Silva"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="joao@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={customer.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div>
                <Label htmlFor="document">CPF/CNPJ *</Label>
                <Input
                  id="document"
                  value={customer.document}
                  onChange={(e) => handleInputChange("document", e.target.value)}
                  placeholder="Digite apenas números"
                  required
                />
                {customer.document && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Detectado: {customer.document_type} ({customer.document.length} dígitos)
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Itens do Pedido</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  Adicionar Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive"
                      >
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => handleItemChange(index, "title", e.target.value)}
                        placeholder="Nome do produto"
                        required
                      />
                    </div>
                    <div>
                      <Label>Preço (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, "price", Number.parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      placeholder="Descrição do produto"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number.parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id={`physical-${index}`}
                        checked={item.is_physical}
                        onChange={(e) => handleItemChange(index, "is_physical", e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`physical-${index}`}>Produto físico</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>Pagar com PIX - R$ {totalAmount.toFixed(2)}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resumo do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.title || `Item ${index + 1}`}</p>
                  <p className="text-sm text-muted-foreground">
                    Qtd: {item.quantity} × R$ {item.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span>R$ {totalAmount.toFixed(2)}</span>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Pagamento 100% seguro</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Aprovação instantânea</span>
            </div>
          </div>

          <Badge variant="secondary" className="w-full justify-center">
            PIX - Transferência instantânea
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
