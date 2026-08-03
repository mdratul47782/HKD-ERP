// app/style-register/page.tsx
"use client"
import { useState } from "react"

const PRODUCT_TYPES = [
  "JACKET",
  "PANT",
  "T-SHIRT",
  "POLO SHIRT",
  "DRESS SHIRT",
  "BLAZER",
  "SHORTS",
  "SKIRT",
  "DRESS",
  "SWEATER",
  "HOODIE",
  "COAT",
  "VEST",
  "ACTIVEWEAR",
  "OTHERS"
]
const SEASON_CODES = [
  "SS-26",
  "FW-26",
  "AW-26",
  "RS-26",
  "SS-25",
  "FW-25",
  "AW-25",
  "AW-24",
  "SS-24"
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i - 1)

function uid() {
  return Math.random()
    .toString(36)
    .slice(2, 10)
}

const INITIAL = [
  {
    id: uid(),
    styleName: "INNER LIMITS™ III JACKET",
    styleNumber: "WO3535",
    customerName: "COLUMBIA SPORTSWEAR PVT LTD.",
    brand: "Columbia",
    styleDescription: "",
    model: "",
    color: "",
    seasonYear: "2025",
    seasonCode: "FW-25",
    productType: "JACKET",
    releases: [],
    isActive: true
  },
  {
    id: uid(),
    styleName: "TREK 100 RAIN CAPE BLUE",
    styleNumber: "307368",
    customerName: "DECATHLON (WOVEN)",
    brand: "Decathlon",
    styleDescription: "",
    model: "",
    color: "Blue",
    seasonYear: "2025",
    seasonCode: "SS-25",
    productType: "JACKET",
    releases: [],
    isActive: true
  },
  {
    id: uid(),
    styleName: "TROUSERS MT100 MODULAR DARK GREY M",
    styleNumber: "306560",
    customerName: "DECATHLON (WOVEN)",
    brand: "Decathlon",
    styleDescription: "",
    model: "",
    color: "Dark Grey",
    seasonYear: "2025",
    seasonCode: "SS-25",
    productType: "PANT",
    releases: [],
    isActive: true
  },
  {
    id: uid(),
    styleName: "TEST-009",
    styleNumber: "9898989",
    customerName: "TEST",
    brand: "",
    styleDescription: "",
    model: "",
    color: "",
    seasonYear: "2025",
    seasonCode: "SS-25",
    productType: "PANT",
    releases: [],
    isActive: true
  },
  {
    id: uid(),
    styleName: "HOOD FLEECE JR",
    styleNumber: "100554",
    customerName: "DECATHLON(KNIT)",
    brand: "Decathlon",
    styleDescription: "",
    model: "",
    color: "",
    seasonYear: "2024",
    seasonCode: "AW-24",
    productType: "OTHERS",
    releases: [],
    isActive: true
  },
  {
    id: uid(),
    styleName: "BGP 100 NECK SCARP",
    styleNumber: "116231",
    customerName: "DECATHLON(KNIT)",
    brand: "Decathlon",
    styleDescription: "",
    model: "",
    color: "",
    seasonYear: "2024",
    seasonCode: "AW-24",
    productType: "OTHERS",
    releases: [],
    isActive: true
  },
  {
    id: uid(),
    styleName: "FLEECE HOOD",
    styleNumber: "100064 AW-24",
    customerName: "DECATHLON (WOVEN)",
    brand: "Decathlon",
    styleDescription: "",
    model: "",
    color: "",
    seasonYear: "2024",
    seasonCode: "AW-24",
    productType: "OTHERS",
    releases: [],
    isActive: false
  }
]

const EMPTY_FORM = {
  styleName: "",
  styleNumber: "",
  customerName: "",
  brand: "",
  styleDescription: "",
  model: "",
  color: "",
  seasonYear: String(CURRENT_YEAR),
  seasonCode: "SS-26",
  productType: ""
}

function LabelCol({ children }) {
  return (
    <div className="w-40 shrink-0 pt-2.5 text-sm font-semibold text-gray-800">
      {children} :
    </div>
  )
}

export default function StyleRegisterPage() {
  const [records, setRecords] = useState(INITIAL)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [releases, setReleases] = useState([
    { id: uid(), qty: "", releaseBy: "" }
  ])
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addRelease = () =>
    setReleases(r => [...r, { id: uid(), qty: "", releaseBy: "" }])

  const removeRelease = id =>
    setReleases(r => (r.length > 1 ? r.filter(x => x.id !== id) : r))

  const updateRelease = (id, field, val) =>
    setReleases(r => r.map(x => (x.id === id ? { ...x, [field]: val } : x)))

  const totalQty = rel => rel.reduce((s, r) => s + (parseInt(r.qty) || 0), 0)

  const validate = () => {
    const e = {}
    if (!form.customerName.trim()) e.customerName = "Required"
    if (!form.styleName.trim()) e.styleName = "Required"
    if (!form.styleNumber.trim()) e.styleNumber = "Required"
    if (!form.seasonCode) e.seasonCode = "Required"
    if (!form.productType) e.productType = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setRecords(prev => [
      {
        id: uid(),
        ...form,
        releases: releases.filter(r => r.qty || r.releaseBy),
        isActive: true
      },
      ...prev
    ])
    setForm({ ...EMPTY_FORM })
    setReleases([{ id: uid(), qty: "", releaseBy: "" }])
    setErrors({})
    setModalOpen(false)
  }

  const handleReset = () => {
    setForm({ ...EMPTY_FORM })
    setReleases([{ id: uid(), qty: "", releaseBy: "" }])
    setErrors({})
  }

  const toggleActive = id =>
    setRecords(r =>
      r.map(x => (x.id === id ? { ...x, isActive: !x.isActive } : x))
    )

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    return (
      !q ||
      r.styleName.toLowerCase().includes(q) ||
      r.styleNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.seasonCode.toLowerCase().includes(q)
    )
  })

  const inputCls = field =>
    `w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all
    focus:border-[#3B9ED4] focus:ring-2 focus:ring-[#3B9ED4]/20
    placeholder:text-gray-400 placeholder:uppercase placeholder:tracking-wide
    ${
      field && errors[field]
        ? "border-red-400 bg-red-50"
        : "border-gray-200 bg-white"
    }`

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#3B9ED4] hover:bg-[#2E8EC4] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Style Register
        </button>

        <div className="relative w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#3B9ED4] focus:ring-2 focus:ring-[#3B9ED4]/20 bg-white placeholder:uppercase placeholder:tracking-widest placeholder:text-xs placeholder:text-gray-400"
            placeholder="Search Style..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#C8E3F5]">
                {[
                  "Style Name",
                  "Style Number",
                  "Customer Name",
                  "Season",
                  "Product Type",
                  "Is Active"
                ].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 text-center border-b border-[#A8D3EC]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-gray-400 text-sm"
                  >
                    No styles found. Register a style using the button above.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-[#EEF6FC]"}
                >
                  <td className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-800 border-b border-gray-100">
                    {r.styleName}
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs uppercase tracking-wide text-gray-700 border-b border-gray-100">
                    {r.styleNumber}
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs uppercase tracking-wide text-gray-700 border-b border-gray-100">
                    {r.customerName}
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs font-semibold uppercase text-gray-700 border-b border-gray-100">
                    {r.seasonCode}
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs uppercase tracking-wide text-gray-700 border-b border-gray-100">
                    {r.productType}
                  </td>
                  <td className="px-5 py-3.5 text-center border-b border-gray-100">
                    <button
                      onClick={() => toggleActive(r.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        r.isActive ? "bg-[#3B9ED4]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block rounded-full bg-white shadow transition-transform duration-200 ${
                          r.isActive ? "translate-x-5" : "translate-x-1"
                        }`}
                        style={{ width: 18, height: 18 }}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-400 text-right">
          Showing {filtered.length} of {records.length} styles
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Style Register
              </h2>
              <div className="flex items-center gap-3">
                <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form body */}
            <div className="px-7 py-6 space-y-5">
              {/* Customer Name */}
              <div className="flex items-start gap-4">
                <LabelCol>Customer Name</LabelCol>
                <div className="flex-1">
                  <input
                    className={inputCls("customerName")}
                    placeholder="Enter Customer Name..."
                    value={form.customerName}
                    onChange={e => set("customerName", e.target.value)}
                  />
                  {errors.customerName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customerName}
                    </p>
                  )}
                </div>
              </div>

              {/* Style Name */}
              <div className="flex items-start gap-4">
                <LabelCol>Style Name</LabelCol>
                <div className="flex-1">
                  <input
                    className={inputCls("styleName")}
                    placeholder="Enter Style Name..."
                    value={form.styleName}
                    onChange={e => set("styleName", e.target.value)}
                  />
                  {errors.styleName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.styleName}
                    </p>
                  )}
                </div>
              </div>

              {/* Style Number */}
              <div className="flex items-start gap-4">
                <LabelCol>Style Number</LabelCol>
                <div className="flex-1">
                  <input
                    className={inputCls("styleNumber")}
                    placeholder="Enter Style Number..."
                    value={form.styleNumber}
                    onChange={e => set("styleNumber", e.target.value)}
                  />
                  {errors.styleNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.styleNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Season */}
              <div className="flex items-start gap-4">
                <LabelCol>Season</LabelCol>
                <div className="flex-1 flex gap-3">
                  <select
                    className={inputCls() + " cursor-pointer"}
                    value={form.seasonYear}
                    onChange={e => set("seasonYear", e.target.value)}
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputCls("seasonCode") + " cursor-pointer"}
                    value={form.seasonCode}
                    onChange={e => set("seasonCode", e.target.value)}
                  >
                    {SEASON_CODES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.seasonCode && (
                <p className="text-red-500 text-xs -mt-4 ml-44">
                  {errors.seasonCode}
                </p>
              )}

              {/* Product Type */}
              <div className="flex items-start gap-4">
                <LabelCol>Product Type</LabelCol>
                <div className="flex-1">
                  <select
                    className={inputCls("productType") + " cursor-pointer"}
                    value={form.productType}
                    onChange={e => set("productType", e.target.value)}
                  >
                    <option value="">--Select--</option>
                    {PRODUCT_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {errors.productType && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.productType}
                    </p>
                  )}
                </div>
              </div>

              {/* Order Qty & Releases */}
              <div className="flex items-start gap-4">
                <LabelCol>Order Qty</LabelCol>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                    <span>Quantity (units)</span>
                    <span>Release By</span>
                  </div>
                  {releases.map(r => (
                    <div key={r.id} className="flex gap-2 items-center">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <input
                          type="number"
                          min="0"
                          className={inputCls()}
                          placeholder="Enter Qty..."
                          value={r.qty}
                          onChange={e =>
                            updateRelease(r.id, "qty", e.target.value)
                          }
                        />
                        <input
                          type="date"
                          className={inputCls()}
                          value={r.releaseBy}
                          onChange={e =>
                            updateRelease(r.id, "releaseBy", e.target.value)
                          }
                        />
                      </div>
                      <button
                        onClick={() => removeRelease(r.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none w-6"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addRelease}
                    className="text-xs text-[#3B9ED4] hover:text-[#2E8EC4] font-semibold flex items-center gap-1 mt-1 transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Add
                    Release
                  </button>
                  {releases.some(r => r.qty) && (
                    <div className="text-xs text-gray-500 mt-1">
                      Total:{" "}
                      <span className="font-bold text-[#3B9ED4]">
                        {totalQty(releases).toLocaleString()} units
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Brand */}
              <div className="flex items-start gap-4">
                <LabelCol>Brand</LabelCol>
                <div className="flex-1">
                  <input
                    className={inputCls()}
                    placeholder="Enter Brand..."
                    value={form.brand}
                    onChange={e => set("brand", e.target.value)}
                  />
                </div>
              </div>

              {/* Color */}
              <div className="flex items-start gap-4">
                <LabelCol>Color</LabelCol>
                <div className="flex-1">
                  <input
                    className={inputCls()}
                    placeholder="Enter Color..."
                    value={form.color}
                    onChange={e => set("color", e.target.value)}
                  />
                </div>
              </div>

              {/* Model */}
              <div className="flex items-start gap-4">
                <LabelCol>Model</LabelCol>
                <div className="flex-1">
                  <input
                    className={inputCls()}
                    placeholder="Enter Model..."
                    value={form.model}
                    onChange={e => set("model", e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-4">
                <LabelCol>Description</LabelCol>
                <div className="flex-1">
                  <textarea
                    className={inputCls() + " resize-none"}
                    rows={3}
                    placeholder="Enter Style Description..."
                    value={form.styleDescription}
                    onChange={e => set("styleDescription", e.target.value)}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="flex items-start gap-4">
                <LabelCol>Images</LabelCol>
                <div className="flex-1">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#3B9ED4] hover:bg-[#EEF6FC] transition-all group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <svg
                      className="text-gray-300 group-hover:text-[#3B9ED4] transition-colors"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-xs text-gray-400 group-hover:text-[#3B9ED4] mt-1.5 transition-colors">
                      Click to upload style images
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-2.5 border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4" />
                </svg>
                Reset
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#3B9ED4] hover:bg-[#2E8EC4] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
