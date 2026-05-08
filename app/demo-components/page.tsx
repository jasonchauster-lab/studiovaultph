'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Field } from '@/components/ui/Field'
import { Checkbox } from '@/components/ui/Checkbox'
import { Textarea } from '@/components/ui/Textarea'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip'
import { Popover } from '@/components/ui/Popover'
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton'
import { Kbd } from '@/components/ui/Kbd'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Separator } from '@/components/ui/Separator'
import { 
  Search, Mail, Bell, CheckCircle2, AlertTriangle, 
  Info, XCircle, CreditCard, Package, User, Star
} from 'lucide-react'

export default function DemoComponentsPage() {
  const [inputValue, setInputValue] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectValue, setSelectValue] = useState('')
  const [activeTab, setActiveTab] = useState('one')
  const [switchChecked, setSwitchChecked] = useState(false)
  const [checkboxValue, setCheckboxValue] = useState(false)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#fbf9f3] p-6 md:p-12 space-y-16">
        <header className="max-w-4xl mx-auto text-center space-y-4">
          <Breadcrumbs items={[{ label: 'Design System' }, { label: 'UI Library' }]} />
          <h1 className="text-4xl md:text-6xl font-serif text-zinc-900 tracking-tight">Studio UI Library</h1>
          <p className="label-atelier">A Living Style Guide for Digital Atelier</p>
          <Separator className="mx-auto w-24 bg-zinc-900 h-1 mt-6" />
        </header>

        <main className="max-w-7xl mx-auto space-y-24">
          
          {/* Foundation: Layout & Wayfinding */}
          <section className="space-y-8">
            <h2 className="text-2xl font-serif text-zinc-900 px-2">Foundation: Layout & Wayfinding</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card 
                header={
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif text-zinc-900">Card Component</h3>
                    <p className="text-xs text-zinc-500">Standardized elevation and container.</p>
                  </div>
                }
              >
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600">Cards support headers, descriptions, and flexible children.</p>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Footer Slot</span>
                    <Button size="sm" variant="outline">Action</Button>
                  </div>
                </div>
              </Card>
              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="label-atelier text-[10px]">Breadcrumbs</span>
                  <Breadcrumbs items={[{ label: 'Studio' }, { label: 'Pricing' }, { label: 'Memberships' }]} />
                </div>
                <div className="space-y-2">
                  <span className="label-atelier text-[10px]">Separators</span>
                  <div className="flex h-5 items-center space-x-4 text-sm">
                    <div>Horizontal</div>
                    <Separator orientation="vertical" />
                    <div>Vertical</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Form Controls */}
          <section className="space-y-8">
            <h2 className="text-2xl font-serif text-zinc-900 px-2">Form Elements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <Field label="Standard Input" hint="This is a helper hint.">
                  <Input placeholder="Type something..." icon={Search} />
                </Field>
                <Field label="Input with Error" error="Invalid input provided.">
                  <Input placeholder="Error state..." icon={XCircle} className="border-red-200" />
                </Field>
              </div>
              <div className="space-y-6">
                <Field label="Select Component">
                  <Select 
                    value={selectValue}
                    onChange={setSelectValue}
                    options={[
                      { label: 'Yoga', value: 'yoga' },
                      { label: 'Pilates', value: 'pilates' },
                      { label: 'Barre', value: 'barre' },
                    ]}
                  />
                </Field>
                <div className="flex flex-col gap-6">
                  <Checkbox 
                    label="Premium Accessible Checkbox" 
                    checked={checkboxValue}
                    onChange={setCheckboxValue}
                  />
                  <Switch 
                    label="Visual Toggle (Switch)" 
                    checked={switchChecked}
                    onChange={setSwitchChecked}
                  />
                </div>
              </div>
              <div className="space-y-6">
                <Field label="Textarea Component">
                  <Textarea placeholder="Multi-line input support..." rows={4} />
                </Field>
              </div>
            </div>
          </section>

          {/* Status & Feedback */}
          <section className="space-y-8">
            <h2 className="text-2xl font-serif text-zinc-900 px-2">Status & Feedback</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert title="Success Alert" variant="success">Your changes have been saved successfully.</Alert>
                <Alert title="Warning Alert" variant="warning">Your subscription is about to expire.</Alert>
                <Alert title="Error Alert" variant="error">Unable to delete this item.</Alert>
                <Alert title="Info Alert" variant="info">New feature available in the dashboard.</Alert>
              </div>
              
              <div className="p-8 bg-white border border-zinc-100 rounded-3xl space-y-8">
                <div className="flex flex-wrap gap-4 items-center">
                  <Badge variant="success" showDot>Active</Badge>
                  <Badge variant="outline" showDot>Private</Badge>
                  <Badge variant="error" showDot>Declined</Badge>
                  <Badge variant="warning">Attention</Badge>
                  <Badge variant="vault">Premium</Badge>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="forest" isLoading>Loading State</Button>
                </div>
              </div>
            </div>
          </section>

          {/* Data Display */}
          <section className="space-y-8">
            <h2 className="text-2xl font-serif text-zinc-900 px-2">Data Display (Table)</h2>
            <Table 
              data={[
                { id: '1', product: 'Standard Package 1', status: 'Live', price: '₱2,500' },
                { id: '2', product: 'Standard Package 2', status: 'Draft', price: '₱2,500' },
                { id: '3', product: 'Standard Package 3', status: 'Live', price: '₱2,500' },
              ]}
              keyExtractor={(item) => item.id}
              columns={[
                {
                  header: 'Product',
                  accessor: (item) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                        <Package size={20} className="text-zinc-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{item.product}</span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Ref: #00{item.id}</span>
                      </div>
                    </div>
                  )
                },
                {
                  header: 'Status',
                  accessor: (item) => (
                    <Badge variant={item.status === 'Live' ? 'success' : 'outline'} showDot>
                      {item.status}
                    </Badge>
                  )
                },
                {
                  header: 'Price',
                  accessor: (item) => (
                    <span className="text-sm font-black text-zinc-900">{item.price}</span>
                  )
                },
                {
                  header: 'Actions',
                  accessor: () => (
                    <div className="flex items-center gap-2">
                      <Tooltip content="Quick Edit">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <CheckCircle2 size={16} />
                        </Button>
                      </Tooltip>
                    </div>
                  )
                }
              ]}
              className="bg-white"
            />
          </section>

          {/* Overlays & Utilities */}
          <section className="space-y-8">
            <h2 className="text-2xl font-serif text-zinc-900 px-2">Overlays & Utilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card 
                header={
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif text-zinc-900">Skeleton Loading</h3>
                    <p className="text-xs text-zinc-500">Perceived performance primitives.</p>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <SkeletonCircle className="w-12 h-12" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              </Card>

              <Card 
                header={
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif text-zinc-900">ScrollArea & Shortcuts</h3>
                    <p className="text-xs text-zinc-500">Custom scrollbars and Kbd tooltips.</p>
                  </div>
                }
              >
                <div className="space-y-4">
                  <ScrollArea className="h-32 rounded-xl border border-zinc-100 p-4 bg-zinc-50">
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <p key={i} className="text-sm text-zinc-500">Scroll item line number {i}</p>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Press</span>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                    <span className="text-xs text-zinc-500">to search</span>
                  </div>
                </div>
              </Card>

              <Card 
                header={
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif text-zinc-900">Modals</h3>
                    <p className="text-xs text-zinc-500">Focus-trapped accessible overlays.</p>
                  </div>
                }
              >
                <Button onClick={() => setIsModalOpen(true)} className="w-full">Open Modal Demo</Button>
                <Modal 
                  isOpen={isModalOpen} 
                  onClose={() => setIsModalOpen(false)}
                  title="Design System Modal"
                >
                  <p className="text-zinc-600">This modal uses Portals, Framer Motion, and Radix focus management for the best possible user experience.</p>
                </Modal>
              </Card>
            </div>
          </section>

        </main>

        <footer className="max-w-4xl mx-auto text-center py-20 border-t border-zinc-100">
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Studio Vault PH • UI Design System 2026</p>
        </footer>
      </div>
    </TooltipProvider>
  )
}
