# HKD ERP - ডাটাবেস স্কিমা এবং ওয়ার্কফ্লো ডকুমেন্টেশন

> এই ডকুমেন্ট প্রজেক্টের সম্পূর্ণ ডাটাবেস স্ট্রাকচার, সকল টেবিলের উদ্দেশ্য, তাদের ব্যবহার, সম্পর্ক এবং ডেটা প্রবাহ বিস্তারিতভাবে ব্যাখ্যা করে।

---

## 📋 সূচি

1. [সংক্ষিপ্ত বিবরণ](#সংক্ষিপ্ত-বিবরণ)
2. [সকল টেবিলের তালিকা](#সকল-টেবিলের-তালিকা)
3. [প্রতিটি টেবিলের বিস্তারিত](#প্রতিটি-টেবিলের-বিস্তারিত)
4. [মডিউল-ভিত্তিক ওয়ার্কফ্লো](#মডিউল-ভিত্তিক-ওয়ার্কফ্লো)
5. [ডেটা সম্পর্ক এবং FK](#ডেটা-সম্পর্ক-এবং-fk)
6. [ফ্রন্টএন্ড থেকে ব্যাকএন্ড থেকে ডাটাবেস ডেটা প্রবাহ](#ফ্রন্টএন্ড-থেকে-ব্যাকএন্ড-থেকে-ডাটাবেস-ডেটা-প্রবাহ)
7. [কী পয়েন্টস এবং ডিজাইন নোটস](#কী-পয়েন্টস-এবং-ডিজাইন-নোটস)

---

## সংক্ষিপ্ত বিবরণ

এই ERP প্রজেক্টটি একটি **টেক্সটাইল/গার্মেন্ট ম্যানুফ্যাকচারিং** প্ল্যাটফর্ম যা দুটি প্রধান মডিউলের উপর কাজ করে:

### 1. **Material Warehouse (উপকরণ গুদাম)**
   - মালামাল গ্রহণ (Material Receive)
   - রাক/লোকেশনে বরাদ্দ (Location Assignment)
   - স্টকের উপলব্ধতা অনুসন্ধান (Material Stock Search)

### 2. **Cutting (কাটিং বিভাগ)**
   - কাটিংয়ের জন্য উপকরণ অনুরোধ (Cutting Requisition)
   - গুদাম থেকে উপকরণ ইস্যু করা (Cutting Issue)
   - ইস্যু ইতিহাস ট্র্যাক করা

> **মূল বিষয়**: সিস্টেমে সর্বোচ্চ গুরুত্বপূর্ণ টেবিল হল `materialReceiveItemLocations` কারণ এটি **সত্য উপলব্ধ স্টক** ট্র্যাক করে। যখন একটি মালামাল একটি রাকে রাখা হয় বা কাটিংয়ে ইস্যু করা হয়, এই টেবিলের `availableRoll` এবং `availableYds` কলাম আপডেট হয়।

---

## সকল টেবিলের তালিকা

প্রজেক্টে মোট **৯টি টেবিল** রয়েছে:

| # | টেবিলের নাম | উদ্দেশ্য | মডিউল | স্ট্যাটাস |
|---|---|---|---|---|
| 1 | `users` | ব্যবহারকারী প্রমাণীকরণ এবং প্রোফাইল | Auth | মূল |
| 2 | `materialReceives` | মালামাল গ্রহণের মূল তথ্য | Material Warehouse | মূল |
| 3 | `materialReceiveStyles` | প্রতিটি গ্রহণের সাথে স্টাইল/মডেল | Material Warehouse | সাপোর্টিং |
| 4 | `materialReceiveItems` | স্টক ব্যাচ (প্রতি Item Code + Color) | Material Warehouse | মূল |
| 5 | `materialReceiveItemLocations` | রাক/লোকেশন বরাদ্দ | Material Warehouse | মূল |
| 6 | `stockHistory` | সকল স্টক হালচালের লেজার | Material Warehouse | অডিট |
| 7 | `cuttingRequisitions` | কাটিং বিভাগের অনুরোধ | Cutting | মূল |
| 8 | `cuttingRequisitionItems` | প্রতিটি অনুরোধের আইটেম লাইন | Cutting | মূল |
| 9 | `cuttingIssues` | ইস্যু করা উপকরণের ইতিহাস | Cutting | অডিট |

---

## প্রতিটি টেবিলের বিস্তারিত

### 1️⃣ **users** টেবিল

**উদ্দেশ্য**: ব্যবহারকারীর প্রমাণীকরণ এবং প্রোফাইল তথ্য সংরক্ষণ করা।

**কলামস**:
- `id` (PK) - ব্যবহারকারী ID
- `user_name` - অনন্য ব্যবহারকারীর নাম
- `email` - অনন্য ইমেইল
- `password` - পাসওয়ার্ড
- `role` - ভূমিকা (e.g., "Developer", "ERP-Executive", "Warehouse", "Cutting")
- `department` - বিভাগ
- `assigned_building` - নিযুক্ত বিল্ডিং
- `factory` - ফ্যাক্টরি
- `profile_picture` - প্রোফাইল ছবি URL (Cloudinary)
- `profile_picture_id` - Cloudinary ID
- `createdAt` - তৈরির সময়

**কখন ব্যবহৃত হয়**:
- লগইন / রেজিস্ট্রেশন
- ব্যবহারকারীর প্রোফাইল দেখা এবং আপডেট করা
- বিভাগ এবং রোল-ভিত্তিক অনুমতি নির্ধারণ

**API এন্ডপয়েন্ট**:
- `POST /auth/register`
- `POST /auth/login`
- `PUT /auth/update`
- `POST /auth/refresh`

---

### 2️⃣ **materialReceives** টেবিল (মূল পিতা)

**উদ্দেশ্য**: একটি মালামাল গ্রহণের সম্পূর্ণ ইভেন্ট ট্র্যাক করা। একটি "গ্রহণ" = একটি তারিখ + একটি ইনভয়েস নম্বর + একটি সরবরাহকারী থেকে আসা মালামালের একটি গ্রুপ।

**কলামস**:
- `id` (PK) - গ্রহণ ID
- `date` - গ্রহণের তারিখ
- `invoiceNo` - ইনভয়েস নম্বর
- `fromType` - উৎস টাইপ (e.g., "Supplier", "Factory")
- `warehouse` - গুদাম (K-1, K-2, K-3)
- `buyer` - ক্রেতা
- `season` - সিজন
- `po` - PO নম্বর
- `item` - আইটেম বিভাগ
- `buy` - ক্রয় অর্ডার বা বাই রেফারেন্স
- `remark` - ঐচ্ছিক মন্তব্য
- `status` - স্ট্যাটাস (pending / approved)
- `createdAt` - তৈরির সময়

**সম্পর্ক**:
- **এক-থেকে-অনেক**: `materialReceiveStyles` এবং `materialReceiveItems` এর সাথে

**স্ট্যাটাস লাইফসাইকেল**:
1. **pending**: কোনো রাক বরাদ্দ নেই
2. **approved**: সমস্ত আইটেম ব্যাচ সম্পূর্ণভাবে রাকে রাখা হয়েছে

**কখন ব্যবহৃত হয়**:
- Material Warehouse > Material Receive পৃষ্ঠায় নতুন গ্রহণ তৈরি করা
- সমস্ত গ্রহণের তালিকা দেখা
- একটি নির্দিষ্ট গ্রহণের বিস্তারিত দেখা
- লোকেশন অ্যাসাইনমেন্ট এবং মেটেরিয়াল স্টক সার্চে ফিল্টারিং

**API এন্ডপয়েন্ট**:
- `GET /material-receive` - সকল গ্রহণ (ফিল্টার সাপোর্ট)
- `GET /material-receive/:id` - একটি গ্রহণের বিস্তারিত
- `POST /material-receive` - নতুন গ্রহণ তৈরি
- `PATCH /material-receive/:id` - গ্রহণ আপডেট (শুধু pending অবস্থায়)
- `DELETE /material-receive/:id` - গ্রহণ মুছে ফেলা

---

### 3️⃣ **materialReceiveStyles** টেবিল

**উদ্দেশ্য**: একটি গ্রহণের সাথে Style এবং Model যুক্ত করা। একটি গ্রহণের একাধিক Styles থাকতে পারে, প্রতিটির নিজস্ব Model আছে।

**কলামস**:
- `id` (PK) - Style সারি ID
- `materialReceiveId` (FK) - মূল গ্রহণের রেফারেন্স
- `style` - স্টাইল নাম
- `model` - মডেল নাম

**সম্পর্ক**:
- **অনেক-থেকে-এক**: `materialReceives` এর সাথে
- **একটি গ্রহণের একাধিক স্টাইল হতে পারে**

**কখন ব্যবহৃত হয়**:
- একটি গ্রহণ তৈরির সময়
- Material Stock এবং Cutting Requisition সার্চে "Style" এবং "Model" ফিল্টার করার সময়
- একটি গ্রহণের সম্পূর্ণ তথ্য দেখার সময়

**উদাহরণ**:
```
একটি গ্রহণ (ID: 1) তে দুটি styles যুক্ত:
- Style: "Basic T-Shirt", Model: "Model-A"
- Style: "Casual Shirt", Model: "Model-B"
```

---

### 4️⃣ **materialReceiveItems** টেবিল (মূল ব্যাচ ট্র্যাকিং)

**উদ্দেশ্য**: প্রতিটি **স্টক ব্যাচ** ট্র্যাক করা। একটি ব্যাচ = একটি Item Code/PDM + একটি Color + একটি গ্রহণের জন্য একটি সারি। একই Item Code এবং Color যদি বিভিন্ন তারিখে আসে, তারা আলাদা ব্যাচ।

**কলামস**:
- `id` (PK) - ব্যাচ ID
- `materialReceiveId` (FK) - মূল গ্রহণের রেফারেন্স
- `itemCodePdm` - আইটেম কোড / PDM নম্বর
- `color` - রঙ
- `rollQty` - রোল পরিমাণ (যা গ্রহণ করা হয়েছে, অপরিবর্তনীয়)
- `yds` - গজ পরিমাণ (যা গ্রহণ করা হয়েছে, অপরিবর্তনীয়)
- `unassignedRoll` - এখনও কোনো রাকে রাখা হয়নি এমন রোলের সংখ্যা
- `unassignedYds` - এখনও রাকে রাখা হয়নি এমন গজের সংখ্যা
- `status` - অবস্থা (pending / partial / approved)
- `approvedAt` - সম্পূর্ণভাবে রাক করা হয়েছে এমন সময়
- `createdAt` - তৈরির সময়

**সম্পর্ক**:
- **এক-থেকে-অনেক**: `materialReceiveItemLocations` এর সাথে (একটি ব্যাচ একাধিক রাকে বিভক্ত হতে পারে)
- **অনেক-থেকে-এক**: `materialReceives` এর সাথে

**স্ট্যাটাস লাইফসাইকেল**:
1. **pending**: সম্পূর্ণ unassigned (unassignedRoll = rollQty, unassignedYds = yds)
2. **partial**: কিছু রাকে, কিছু unassigned
3. **approved**: সম্পূর্ণ রাকে (unassignedRoll = 0, unassignedYds = 0)

**কখন ব্যবহৃত হয়**:
- একটি নতুন গ্রহণ তৈরি করার সময় (প্রতিটি Item Code + Color এর জন্য একটি ব্যাচ সারি তৈরি হয়)
- Location Assignment পৃষ্ঠায় পেন্ডিং ব্যাচ দেখার সময়
- একটি ব্যাচকে রাকে রাখার সময় unassigned পরিমাণ হ্রাস করা
- Cutting Issue হিস্টরিতে ব্যাচের FIFO ক্রম সংরক্ষণ করা (তারিখ অনুযায়ী)

---

### 5️⃣ **materialReceiveItemLocations** টেবিল (সবচেয়ে গুরুত্বপূর্ণ!)

**উদ্দেশ্য**: প্রতিটি **রাক/লোকেশনে** প্রকৃতপক্ষে কত স্টক রয়েছে তা ট্র্যাক করা। এটি **Material Stock এবং Cutting Issue সিস্টেমের কেন্দ্র**।

**কলামস**:
- `id` (PK) - অ্যালোকেশন ID
- `itemId` (FK) - ব্যাচের রেফারেন্স (materialReceiveItems)
- `materialReceiveId` (FK) - গ্রহণের রেফারেন্স
- `location` - রাক/লোকেশন নাম (e.g., "Rack-1", "A2-3")
- `rollQty` - এই রাকে রাখা রোলের সংখ্যা (অপরিবর্তনীয় "নির্ধারিত পরিমাণ")
- `yds` - এই রাকে রাখা গজের সংখ্যা (অপরিবর্তনীয় "নির্ধারিত পরিমাণ")
- `availableRoll` - এই রাকে এখনও উপলব্ধ রোলের সংখ্যা (প্রকৃত উপলব্ধ স্টক)
- `availableYds` - এই রাকে এখনও উপলব্ধ গজের সংখ্যা (প্রকৃত উপলব্ধ স্টক)
- `createdAt` - তৈরির সময়

**সম্পর্ক**:
- **অনেক-থেকে-এক**: `materialReceiveItems` এর সাথে (একটি ব্যাচ অনেক রাকে বিভক্ত হতে পারে)

**কখন ব্যবহৃত হয়**:
1. **Location Assignment** পৃষ্ঠায়: একটি ব্যাচকে রাকে বরাদ্দ করা
2. **Material Stock Search**: সমস্ত উপলব্ধ স্টক প্রদর্শন (availableRoll/Yds পড়া)
3. **Cutting Issue**: কাটিংয়ের জন্য স্টক ইস্যু করা, `availableRoll/Yds` হ্রাস করা

**গুরুত্বপূর্ণ লজিক**:
```
নতুন অ্যালোকেশন তৈরি করলে:
- rollQty = সংরক্ষিত পরিমাণ
- yds = সংরক্ষিত পরিমাণ
- availableRoll = rollQty (শুরুতে সবকিছু উপলব্ধ)
- availableYds = yds (শুরুতে সবকিছু উপলব্ধ)

Cutting Issue হলে:
- availableRoll হ্রাস হয়
- availableYds হ্রাস হয়
- rollQty এবং yds অপরিবর্তিত থাকে (ঐতিহাসিক রেকর্ড)

MERGE আচরণ: যদি একই ব্যাচ একই রাকে দ্বিতীয়বার রাখা হয়:
- নতুন সারি তৈরি না করে বিদ্যমান সারি আপডেট করা হয়
- rollQty এবং yds যোগ করা হয়
- availableRoll এবং availableYds যোগ করা হয়
```

**উদাহরণ**:
```
Batch ID 5 (100 Roll, 500 Yds):
- Allocation 1: Rack-1, rollQty=70, yds=350, availableRoll=70, availableYds=350
- Allocation 2: Rack-2, rollQty=30, yds=150, availableRoll=30, availableYds=150

Material Stock সার্চ = Allocation 1 + Allocation 2 দেখায় (100 Roll, 500 Yds মোট উপলব্ধ)

Cutting Issue 40 Roll from Rack-1:
- Allocation 1 আপডেট: availableRoll=30, availableYds=175
- Material Stock সার্চ = 60 Roll, 325 Yds মোট উপলব্ধ
```

---

### 6️⃣ **stockHistory** টেবিল (অডিট লেজার)

**উদ্দেশ্য**: প্রতিটি স্টক হালচালের একটি সম্পূর্ণ অডিট ট্রেইল রাখা। এটি FIFO সমর্থন এবং সম্পূর্ণ স্টক ট্রেসিবিলিটির জন্য ব্যবহৃত হয়।

**কলামস**:
- `id` (PK) - হিস্টরি এন্ট্রি ID
- `batchId` (FK) - ব্যাচের রেফারেন্স
- `allocationId` (FK) - অ্যালোকেশনের রেফারেন্স (nullable)
- `materialReceiveId` (FK) - গ্রহণের রেফারেন্স
- `action` - অ্যাকশন টাইপ (receive / location_assignment / issue / adjustment)
- `location` - যে লোকেশন থেকে হালচালি হয়েছে
- `rollQty` - এই অ্যাকশনে হালচালিকৃত রোল পরিমাণ
- `yds` - এই অ্যাকশনে হালচালিকৃত গজ পরিমাণ
- `note` - ঐচ্ছিক নোট
- `createdAt` - সময়

**অ্যাকশন টাইপস**:
1. **receive**: নতুন ব্যাচ তৈরি (কোনো রাক নির্ধারিত নয়)
2. **location_assignment**: ব্যাচ একটি রাকে রাখা
3. **issue**: Cutting থেকে স্টক ইস্যু করা
4. **adjustment**: একটি রাক বরাদ্দ সম্পাদনা/সরানো

**কখন ব্যবহৃত হয়**:
- প্রতিটি গুরুত্বপূর্ণ অপারেশনে স্বয়ংক্রিয়ভাবে লিখিত হয়
- ব্যাচের সম্পূর্ণ জীবনচক্র ট্রেস করার জন্য (কখন পেয়েছি, কখন রাকে, কখন ইস্যু)
- ভবিষ্যতে FIFO বাস্তবায়নের জন্য (সবচেয়ে পুরানো ব্যাচ প্রথম ইস্যু করা)

**উদাহরণ**:
```
Batch ID 5 এর হিস্টরি:
1. 2024-01-15 10:00 - receive - 100 Roll, 500 Yds - Invoice #12345
2. 2024-01-15 14:00 - location_assignment - 70 Roll, 350 Yds - Rack-1
3. 2024-01-15 15:00 - location_assignment - 30 Roll, 150 Yds - Rack-2
4. 2024-01-20 09:00 - issue - 40 Roll, 200 Yds - Rack-1 (Cutting PO-123 Floor A-2)
```

---

### 7️⃣ **cuttingRequisitions** টেবিল (কাটিং অনুরোধ - মূল)

**উদ্দেশ্য**: Cutting বিভাগের প্রতিটি অনুরোধ ট্র্যাক করা। এটি গুদাম স্টাফকে নোটিফিকেশনের মাধ্যমে জানায় যে কাটিংয়ের জন্য স্টক লাগছে।

**কলামস**:
- `id` (PK) - অনুরোধ ID
- `date` - অনুরোধের তারিখ
- `buyer` - ক্রেতা
- `floor` - কাটিং ফ্লোর (A-2, B-2, A-3, B-3, etc.)
- `season` - সিজন
- `po` - PO নম্বর
- `style` - স্টাইল
- `model` - মডেল (ঐচ্ছিক)
- `status` - স্ট্যাটাস (pending / partial / fulfilled)
- `isRead` - নোটিফিকেশন পড়া হয়েছে (bell icon)
- `createdAt` - তৈরির সময়

**সম্পর্ক**:
- **এক-থেকে-অনেক**: `cuttingRequisitionItems` এবং `cuttingIssues` এর সাথে

**স্ট্যাটাস লাইফসাইকেল**:
1. **pending**: কোনো স্টক ইস্যু হয়নি
2. **partial**: কিছু আইটেম ইস্যু হয়েছে, কিছু নয়
3. **fulfilled**: সকল আইটেম সম্পূর্ণ ইস্যু হয়েছে

**কখন ব্যবহৃত হয়**:
1. Cutting সাইডে: নতুন অনুরোধ তৈরি করা
2. Cutting সাইডে: অনুরোধের স্ট্যাটাস ট্র্যাক করা
3. Material Warehouse সাইডে: Cutting Issue পৃষ্ঠায় পেন্ডিং অনুরোধ দেখা
4. Material Warehouse সাইডে: বেল আইকনে নতুন/অপঠিত নোটিফিকেশন দেখা

**API এন্ডপয়েন্ট**:
- `GET /cutting-requisition` - সকল অনুরোধ (ফিল্টার সাপোর্ট)
- `GET /cutting-requisition/:id` - একটি অনুরোধের বিস্তারিত
- `POST /cutting-requisition` - নতুন অনুরোধ তৈরি
- `PATCH /cutting-requisition/:id` - অনুরোধ আপডেট (শুধু pending অবস্থায়)
- `DELETE /cutting-requisition/:id` - অনুরোধ মুছে ফেলা (শুধু pending অবস্থায়)

---

### 8️⃣ **cuttingRequisitionItems** টেবিল

**উদ্দেশ্য**: প্রতিটি অনুরোধের মধ্যে কত স্টক চাওয়া হয়েছে এবং কত ইস্যু করা হয়েছে তা ট্র্যাক করা।

**কলামস**:
- `id` (PK) - আইটেম ID
- `cuttingRequisitionId` (FK) - অনুরোধের রেফারেন্স
- `itemCodePdm` - আইটেম কোড / PDM
- `color` - রঙ
- `requestedRoll` - অনুরোধকৃত রোল পরিমাণ (অপরিবর্তনীয়)
- `requestedYds` - অনুরোধকৃত গজ পরিমাণ (অপরিবর্তনীয়)
- `issuedRoll` - এখন পর্যন্ত ইস্যু করা রোল পরিমাণ (ক্রমবর্ধমান)
- `issuedYds` - এখন পর্যন্ত ইস্যু করা গজ পরিমাণ (ক্রমবর্ধমান)
- `status` - স্ট্যাটাস (pending / partial / fulfilled)
- `fulfilledAt` - সম্পূর্ণ ইস্যু সময়
- `createdAt` - তৈরির সময়

**স্ট্যাটাস লাইফসাইকেল**:
1. **pending**: issuedRoll = 0, issuedYds = 0
2. **partial**: 0 < issued < requested
3. **fulfilled**: issuedRoll = requestedRoll, issuedYds = requestedYds

**কখন ব্যবহৃত হয়**:
1. নতুন অনুরোধ তৈরি করার সময় (প্রতিটি Item Code + Color লাইন)
2. Cutting Issue পৃষ্ঠায় কাজের তালিকা দেখার সময়
3. স্টক ইস্যু করার সময় `issuedRoll` এবং `issuedYds` আপডেট করা
4. অনুরোধের সামগ্রিক স্ট্যাটাস গণনা করার সময়

**গুরুত্বপূর্ণ নোট**:
```
কাটিং অনুরোধ এবং ইস্যুয়িং বিভিন্ন দিনে হতে পারে।
উদাহরণ:
- দিন 1: অনুরোধ = 100 Roll
- দিন 2: 50 Roll ইস্যু করা (status = partial)
- দিন 3: 50 Roll ইস্যু করা (status = fulfilled)

এটি কারণ একটি অনুরোধ একাধিক রাক থেকে ইস্যু করা যায়।
```

---

### 9️⃣ **cuttingIssues** টেবিল (ইস্যু হিস্টরি - অডিট)

**উদ্দেশ্য**: প্রতিটি "ইস্যু অ্যাকশন" এর একটি বিস্তারিত হিস্টরি রাখা। কোন রাক থেকে কত স্টক ইস্যু করা হয়েছে এবং কখন তা রেকর্ড করা।

**কলামস**:
- `id` (PK) - ইস্যু ID
- `requisitionItemId` (FK) - অনুরোধ আইটেমের রেফারেন্স
- `cuttingRequisitionId` (FK) - অনুরোধের রেফারেন্স
- `allocationId` (FK) - যে অ্যালোকেশন থেকে ইস্যু করা হয়েছে
- `itemId` (FK) - ব্যাচের রেফারেন্স
- `location` - যে রাক থেকে ইস্যু করা হয়েছে
- `rollQty` - ইস্যু করা রোল পরিমাণ
- `yds` - ইস্যু করা গজ পরিমাণ
- `createdAt` - ইস্যু সময়

**কখন ব্যবহৃত হয়**:
1. প্রতিটি "ইস্যু স্টক" অপারেশনে স্বয়ংক্রিয়ভাবে লিখিত হয়
2. Cutting Issue পৃষ্ঠার "হিস্টরি" ট্যাবে সকল ইস্যু ট্রানজ্যাকশন দেখা
3. কোন রাক থেকে কত স্টক বের হয়েছে তার অডিট ট্রেইল

**উদাহরণ**:
```
Requisition ID 10 (100 Roll এর জন্য অনুরোধ):
Issue 1: Rack-1 থেকে 40 Roll ইস্যু করা
Issue 2: Rack-2 থেকে 35 Roll ইস্যু করা
Issue 3: Rack-1 থেকে 25 Roll ইস্যু করা (একই রাক থেকে দ্বিতীয়বার)
মোট ইস্যু = 100 Roll (সম্পূর্ণ)
```

---

## মডিউল-ভিত্তিক ওয়ার্কফ্লো

### 📦 **Module 1: Material Warehouse (উপকরণ গুদাম)**

#### ওয়ার্কফ্লো ধাপ:

```
1. RECEIVE (গ্রহণ করা)
   ↓
2. LOCATION ASSIGNMENT (রাকে রাখা)
   ↓
3. MATERIAL STOCK SEARCH (উপলব্ধ স্টক দেখা)
   ↓
4. (→ Cutting Module এ চলে যায়)
```

#### প্রতিটি ধাপে টেবিল ব্যবহার:

**ধাপ 1: RECEIVE**
```
টেবিল জড়িত:
- materialReceives → নতুন গ্রহণ রেকর্ড তৈরি
- materialReceiveStyles → Style/Model যোগ করা
- materialReceiveItems → প্রতিটি Item Code + Color এর জন্য ব্যাচ তৈরি
- stockHistory → "receive" অ্যাকশন লিখা

ফ্রন্টএন্ড পৃষ্ঠা: Material Receive > নতুন রিসিভ ফর্ম
API: POST /material-receive
স্ট্যাটাস রূপান্তর: status = "pending" (কোনো রাক এখনও নেই)
```

**ধাপ 2: LOCATION ASSIGNMENT**
```
টেবিল জড়িত:
- materialReceiveItems → unassignedRoll/Yds হ্রাস করা, status আপডেট
- materialReceiveItemLocations → নতুন অ্যালোকেশন তৈরি বা বিদ্যমান মার্জ করা
- stockHistory → "location_assignment" অ্যাকশন লিখা

ফ্রন্টএন্ড পৃষ্ঠা: Material Warehouse > Location Assignment
API: POST /location-assignment/:itemId
স্ট্যাটাস রূপান্তর: 
  - ব্যাচ: pending → partial → approved
  - গ্রহণ: pending → approved (সকল ব্যাচ approved হলে)

MERGE লজিক:
  - একই ব্যাচ, একই রাক → বিদ্যমান সারি আপডেট
  - একই ব্যাচ, ভিন্ন রাক → নতুন সারি তৈরি
```

**ধাপ 3: MATERIAL STOCK SEARCH**
```
টেবিল জড়িত:
- materialReceiveItemLocations → availableRoll/Yds পড়া (মূল বিষয়)
- materialReceiveItems → পরিচয় তথ্য যোগ করা
- materialReceives → তারিখ এবং অন্যান্য ফিল্টার যোগ করা
- materialReceiveStyles → Style/Model ফিল্টারিং

ফ্রন্টএন্ড পৃষ্ঠা: Material Warehouse > Material Stock
API: GET /material-stock?itemCodePdm=...&color=...&location=...
প্রদর্শিত ডেটা:
  - প্রতিটি রাক অ্যালোকেশন আলাদা সারি হিসাবে
  - availableRoll/Yds = মোট উপলব্ধ স্টক
  - সারাংশ = প্রতি Item Code + Color এর মোট উপলব্ধ (সকল রাক)

FIFO সমর্থন: তারিখ অনুযায়ী বাছাই (সবচেয়ে পুরানো প্রথম)
```

---

### ✂️ **Module 2: Cutting (কাটিং বিভাগ)**

#### ওয়ার্কফ্লো ধাপ:

```
1. CREATE REQUISITION (অনুরোধ তৈরি করা)
   ↓
2. NOTIFY WAREHOUSE (গুদামকে সতর্ক করা)
   ↓
3. ISSUE STOCK (গুদাম থেকে স্টক ইস্যু করা)
   ↓
4. TRACK HISTORY (ইস্যু ইতিহাস দেখা)
```

#### প্রতিটি ধাপে টেবিল ব্যবহার:

**ধাপ 1: CREATE REQUISITION (Cutting সাইড)**
```
টেবিল জড়িত:
- cuttingRequisitions → নতুন অনুরোধ তৈরি, isRead = false
- cuttingRequisitionItems → প্রতিটি Item Code + Color লাইন যোগ করা

ফ্রন্টএন্ড পৃষ্ঠা: Cutting > Cutting Requisition
API: POST /cutting-requisition
স্ট্যাটাস: status = "pending" (কোনো স্টক এখনও ইস্যু হয়নি)

ডেটা মডেল:
{
  date: "2024-01-20",
  buyer: "Decathlon",
  floor: "A-2",
  season: "SS2024",
  po: "PO-123",
  style: "Basic T-Shirt",
  model: "Model-A",
  items: [
    { itemCodePdm: "ITEM-001", color: "Blue", requestedRoll: 50, requestedYds: 250 },
    { itemCodePdm: "ITEM-002", color: "Red", requestedRoll: 50, requestedYds: 250 }
  ]
}
```

**ধাপ 2: NOTIFY WAREHOUSE**
```
কীভাবে কাজ করে:
- প্রতিটি নতুন requisition স্বয়ংক্রিয়ভাবে isRead = false সহ তৈরি হয়
- গুদাম সাইড: বেল আইকন নোটিফিকেশন দেখা

টেবিল জড়িত:
- cuttingRequisitions → isRead ফ্ল্যাগ পড়া

ফ্রন্টএন্ড পৃষ্ঠা: Material Warehouse > Cutting Issue > Notifications
API: GET /cutting-issue/notifications → { unreadCount, notifications: [...] }
API: PATCH /cutting-issue/:requisitionId/read → isRead = true আপডেট করা
```

**ধাপ 3: ISSUE STOCK (Warehouse সাইড - মূল বিষয়)**
```
টেবিল জড়িত:
- cuttingRequisitionItems → issuedRoll/Yds আপডেট করা, status পরিবর্তন করা
- cuttingRequisitions → সামগ্রিক status আপডেট করা
- materialReceiveItemLocations → availableRoll/Yds হ্রাস করা (স্টক বের করা)
- cuttingIssues → নতুন ইস্যু রেকর্ড তৈরি করা
- stockHistory → "issue" অ্যাকশন লিখা

ফ্রন্টএন্ড পৃষ্ঠা: Material Warehouse > Cutting Issue > Worklist
API: POST /cutting-issue/:requisitionItemId/batch
Body: { allocations: [{ allocationId, rollQty, yds }, ...] }

স্ট্যাটাস রূপান্তর:
  - cuttingRequisitionItem:
    - pending → partial (প্রথম ইস্যু)
    - partial → fulfilled (সম্পূর্ণ ইস্যু)
  - cuttingRequisition:
    - pending → partial (কিছু আইটেম ইস্যু)
    - partial → fulfilled (সকল আইটেম সম্পূর্ণ)

উদাহরণ:
Item ID 1: requestedRoll = 100
- Issue 1: allocationId=5 (Rack-1), rollQty=40 → issuedRoll=40, status=partial
- Issue 2: allocationId=6 (Rack-2), rollQty=35 → issuedRoll=75, status=partial
- Issue 3: allocationId=5 (Rack-1), rollQty=25 → issuedRoll=100, status=fulfilled

প্রতিটি Issue এ:
1. materialReceiveItemLocations (অ্যালোকেশন) availableRoll/Yds হ্রাস
2. cuttingRequisitionItems issuedRoll/Yds বৃদ্ধি
3. cuttingIssues টেবিলে এন্ট্রি যোগ করা
4. stockHistory টেবিলে "issue" লিখা
```

**ধাপ 4: TRACK HISTORY**
```
টেবিল জড়িত:
- cuttingIssues → সকল ইস্যু ট্রানজ্যাকশন পড়া

ফ্রন্টএন্ড পৃষ্ঠা: Material Warehouse > Cutting Issue > History
API: GET /cutting-issue/history
প্রদর্শিত ডেটা:
  - Requisition ID, Item Code, Color, Requested vs Issued
  - কোন রাক থেকে কত বের হয়েছে
  - সময় এবং PO/Floor তথ্য
```

---

## ডেটা সম্পর্ক এবং FK

### সম্পর্ক ডায়াগ্রাম:

```
                           users
                             |
                             |
         ┌─────────────────────────────────────────┐
         |                                         |
         |                                         |
    materialReceives                          cuttingRequisitions
    (গ্রহণ রেকর্ড)                          (অনুরোধ রেকর্ড)
         |                                         |
         ├─→ materialReceiveStyles                 ├─→ cuttingRequisitionItems
         |   (Style/Model)                         |   (অনুরোধের আইটেম)
         |                                         |
         ├─→ materialReceiveItems                  └─→ cuttingIssues
         |   (স্টক ব্যাচ)                          (ইস্যু হিস্টরি)
         |       |
         |       ├─→ materialReceiveItemLocations
         |       |   (রাক অ্যালোকেশন)
         |       |       ↓
         |       |   [এখানে availableRoll/Yds
         |       |    হ্রাস করা হয় Cutting এ]
         |       |
         |       └─→ stockHistory
         |           (ব্যাচ লেভেল অডিট)
         |
         └─→ stockHistory
             (গ্রহণ লেভেল অডিট)

সম্পর্ক সারাংশ:
- materialReceives ← (parent) → materialReceiveStyles, materialReceiveItems
- materialReceiveItems ← (parent) → materialReceiveItemLocations
- cuttingRequisitions ← (parent) → cuttingRequisitionItems, cuttingIssues
- materialReceiveItemLocations → cuttingIssues (রাক থেকে ইস্যু ট্র্যাক করা)
- stockHistory (সকল অপারেশন লিখা)
```

### Foreign Key সম্পর্ক:

```
materialReceiveStyles:
  materialReceiveId → materialReceives.id [ON DELETE CASCADE]

materialReceiveItems:
  materialReceiveId → materialReceives.id [ON DELETE CASCADE]

materialReceiveItemLocations:
  itemId → materialReceiveItems.id [ON DELETE CASCADE]
  materialReceiveId → materialReceives.id [ON DELETE CASCADE]

stockHistory:
  batchId → materialReceiveItems.id [ON DELETE CASCADE]
  allocationId → materialReceiveItemLocations.id [ON DELETE CASCADE]
  materialReceiveId → materialReceives.id [ON DELETE CASCADE]

cuttingRequisitionItems:
  cuttingRequisitionId → cuttingRequisitions.id [ON DELETE CASCADE]

cuttingIssues:
  requisitionItemId → cuttingRequisitionItems.id [ON DELETE CASCADE]
  cuttingRequisitionId → cuttingRequisitions.id [ON DELETE CASCADE]
  allocationId → materialReceiveItemLocations.id [ON DELETE CASCADE]
  itemId → materialReceiveItems.id [ON DELETE CASCADE]
```

---

## ফ্রন্টএন্ড থেকে ব্যাকএন্ড থেকে ডাটাবেস ডেটা প্রবাহ

### 📤 **ডেটা প্রবাহ উদাহরণ 1: নতুন গ্রহণ তৈরি করা**

```
1. FRONTEND: Material Warehouse > Material Receive > "+ New Receive" ক্লিক করুন
   ├─ ফর্ম পূরণ করুন:
   │  ├─ Date: 2024-01-20
   │  ├─ Invoice No: INV-12345
   │  ├─ Buyer: Decathlon
   │  ├─ Season: SS2024
   │  ├─ PO: PO-789
   │  ├─ Styles: [{ style: "Basic T-Shirt", model: "Model-A" }]
   │  └─ Items: [
   │       { itemCodePdm: "ITEM-001", color: "Blue", rollQty: 100, yds: 500 }
   │     ]
   └─ Submit ক্লিক করুন

2. FRONTEND JS: API কল করুন
   └─ POST /material-receive
      Body: { date, invoiceNo, ..., styles[], items[] }

3. BACKEND: materialReceive.controllers.js → createMaterialReceive()
   └─ ডেটা ভ্যালিডেশন
   └─ Database Transaction শুরু করুন:
      ├─ INSERT materialReceives:
      │  └─ Row created: ID=1, status='pending'
      ├─ INSERT materialReceiveStyles:
      │  └─ Row created: materialReceiveId=1, style='Basic T-Shirt', model='Model-A'
      ├─ INSERT materialReceiveItems:
      │  └─ Row created: ID=101, materialReceiveId=1, itemCodePdm='ITEM-001', 
      │                 color='Blue', rollQty=100, yds=500, 
      │                 unassignedRoll=100, unassignedYds=500, status='pending'
      ├─ SELECT materialReceiveItems (তাদের IDs পেতে)
      ├─ INSERT stockHistory:
      │  └─ Row created: action='receive', batchId=101, rollQty=100, yds=500
      │                  (কোনো রাক এখনও নেই, তাই allocationId=NULL)
      └─ COMMIT transaction
   
4. BACKEND: ফলাফল রিটার্ন করুন
   └─ Response: সম্পূর্ণ গ্রহণ অবজেক্ট সহ styles[] এবং items[]

5. FRONTEND: UI আপডেট করুন
   └─ নতুন গ্রহণ সাফল্যের বার্তা দেখান
   └─ তালিকায় নতুন গ্রহণ যোগ করুন
```

### 📤 **ডেটা প্রবাহ উদাহরণ 2: রাকে রাখা (Location Assignment)**

```
1. FRONTEND: Material Warehouse > Location Assignment
   ├─ পেন্ডিং ব্যাচ তালিকা দেখুন (API: GET /location-assignment)
   ├─ একটি ব্যাচ নির্বাচন করুন:
   │  └─ Batch ID=101, itemCodePdm='ITEM-001', color='Blue', unassignedRoll=100
   ├─ ফর্ম পূরণ করুন:
   │  ├─ Location: "Rack-1"
   │  ├─ Roll Qty: 70
   │  └─ Yds: 350
   └─ Submit ক্লিক করুন

2. FRONTEND JS: API কল করুন
   └─ POST /location-assignment/101
      Body: { location: "Rack-1", rollQty: 70, yds: 350 }

3. BACKEND: locationAssignment.controllers.js → assignLocation()
   └─ ডেটা ভ্যালিডেশন
   └─ Database Transaction শুরু করুন:
      ├─ SELECT materialReceiveItems (ID=101)
      │  └─ Current: unassignedRoll=100, unassignedYds=500, status='pending'
      ├─ SELECT materialReceiveItemLocations (WHERE itemId=101 AND location='Rack-1')
      │  └─ রেজাল্ট: খালি (এই রাকে এর আগে এই ব্যাচ নেই)
      ├─ INSERT materialReceiveItemLocations:
      │  └─ Row created: ID=201, itemId=101, location='Rack-1', 
      │                 rollQty=70, yds=350, 
      │                 availableRoll=70, availableYds=350
      ├─ UPDATE materialReceiveItems (ID=101):
      │  └─ unassignedRoll = 100 - 70 = 30
      │  └─ unassignedYds = 500 - 350 = 150
      │  └─ status = 'partial' (কারণ কিছু এখনও unassigned)
      ├─ INSERT stockHistory:
      │  └─ Row created: action='location_assignment', batchId=101, allocationId=201
      │                 rollQty=70, yds=350, location='Rack-1'
      └─ UPDATE materialReceives (parent গ্রহণ):
         └─ এখনও pending (কারণ অন্য আইটেম থাকতে পারে)
   
4. BACKEND: ফলাফল রিটার্ন করুন
   └─ Response: আপডেট করা ব্যাচ অবজেক্ট

5. FRONTEND: UI আপডেট করুন
   └─ ব্যাচ স্ট্যাটাস: pending → partial
   └─ unassignedRoll: 100 → 30
   └─ locations[]: নতুন অ্যালোকেশন যোগ করুন
```

### 📤 **ডেটা প্রবাহ উদাহরণ 3: Material Stock সার্চ করা**

```
1. FRONTEND: Material Warehouse > Material Stock
   ├─ সার্চ ফিল্টার পূরণ করুন (সব ঐচ্ছিক):
   │  ├─ Item Code: "ITEM-001"
   │  ├─ Color: "Blue"
   │  └─ Location: "Rack-1"
   └─ সার্চ ক্লিক করুন

2. FRONTEND JS: API কল করুন
   └─ GET /material-stock?itemCodePdm=ITEM-001&color=Blue&location=Rack-1

3. BACKEND: materialStock.controllers.js → searchMaterialStock()
   └─ SELECT materialReceiveItemLocations
      JOIN materialReceiveItems (পরিচয় যোগ করতে)
      JOIN materialReceives (তারিখ এবং অন্যান্য তথ্য)
      WHERE ফিল্টার প্রয়োগ করুন
      ORDER BY তারিখ DESC (FIFO)
   └─ রেজাল্ট:
      ├─ Allocation ID=201, Rack-1, ITEM-001, Blue
      │  └─ rollQty=70, yds=350 (বরাদ্দ করা)
      │  └─ availableRoll=70, availableYds=350 (এখনও উপলব্ধ)
      └─ [অন্যান্য অ্যালোকেশন...]
   └─ সারাংশ গণনা করুন:
      └─ ITEM-001 + Blue: totalAvailableRoll=100, totalAvailableYds=500

4. BACKEND: ফলাফল রিটার্ন করুন
   └─ Response: { rows: [...], summary: [...] }

5. FRONTEND: UI দেখান
   └─ প্রতিটি রাক অ্যালোকেশন এক লাইন হিসাবে
   └─ সারাংশ সেকশন: মোট উপলব্ধ স্টক
```

### 📤 **ডেটা প্রবাহ উদাহরণ 4: Cutting Requisition তৈরি করা**

```
1. FRONTEND: Cutting > Cutting Requisition
   ├─ ফর্ম পূরণ করুন:
   │  ├─ Date: 2024-01-20
   │  ├─ Buyer: Decathlon
   │  ├─ Floor: A-2
   │  ├─ Season: SS2024
   │  ├─ PO: PO-789
   │  ├─ Style: Basic T-Shirt
   │  ├─ Model: Model-A
   │  └─ Items:
   │     ├─ { itemCodePdm: "ITEM-001", color: "Blue", requestedRoll: 100, requestedYds: 500 }
   │     └─ { itemCodePdm: "ITEM-002", color: "Red", requestedRoll: 50, requestedYds: 250 }
   └─ Submit ক্লিক করুন

2. FRONTEND JS: API কল করুন
   └─ POST /cutting-requisition
      Body: { date, buyer, floor, ..., items[] }

3. BACKEND: cuttingRequisition.controllers.js → createRequisition()
   └─ ডেটা ভ্যালিডেশন
   └─ Database Transaction শুরু করুন:
      ├─ INSERT cuttingRequisitions:
      │  └─ Row created: ID=1, status='pending', isRead=false
      ├─ INSERT cuttingRequisitionItems:
      │  ├─ Row created: ID=1001, cuttingRequisitionId=1, itemCodePdm='ITEM-001', 
      │  │              color='Blue', requestedRoll=100, requestedYds=500,
      │  │              issuedRoll=0, issuedYds=0, status='pending'
      │  └─ Row created: ID=1002, cuttingRequisitionId=1, itemCodePdm='ITEM-002',
      │                 color='Red', requestedRoll=50, requestedYds=250,
      │                 issuedRoll=0, issuedYds=0, status='pending'
      └─ COMMIT transaction
   
4. BACKEND: ফলাফল রিটার্ন করুন
   └─ Response: অনুরোধ অবজেক্ট সহ items[]

5. FRONTEND: UI আপডেট করুন
   └─ নতুন অনুরোধ তৈরি সাফল্যের বার্তা
   └─ তালিকায় যোগ করুন

6. MATERIAL WAREHOUSE সাইড: স্বয়ংক্রিয় নোটিফিকেশন
   ├─ API: GET /cutting-issue/notifications
   ├─ নতুন requisition: isRead=false, তাই অপঠিত গণনা বৃদ্ধি
   └─ বেল আইকন আপডেট হয়
```

### 📤 **ডেটা প্রবাহ উদাহরণ 5: Cutting Issue (স্টক ইস্যু করা)**

```
1. FRONTEND: Material Warehouse > Cutting Issue > Worklist
   ├─ পেন্ডিং অনুরোধ দেখুন (API: GET /cutting-issue)
   ├─ একটি আইটেম নির্বাচন করুন:
   │  └─ Requisition Item ID=1001, itemCodePdm='ITEM-001', color='Blue'
   │     requestedRoll=100, issuedRoll=0, remaining=100
   ├─ Material Stock সার্চ করুন (API: GET /material-stock?itemCodePdm=ITEM-001&color=Blue)
   │  └─ উপলব্ধ: Rack-1 (70 Roll), Rack-2 (30 Roll)
   ├─ ইস্যু করার জন্য রাক নির্বাচন করুন:
   │  ├─ Rack-1 (Allocation ID=201): 70 Roll ইস্যু করুন
   │  └─ Rack-2 (Allocation ID=202): 30 Roll ইস্যু করুন
   └─ "Issue" বাটন ক্লিক করুন

2. FRONTEND JS: API কল করুন
   └─ POST /cutting-issue/1001/batch
      Body: { 
        allocations: [
          { allocationId: 201, rollQty: 70, yds: 350 },
          { allocationId: 202, rollQty: 30, yds: 150 }
        ]
      }

3. BACKEND: cuttingIssue.controllers.js → issueStockBatch()
   └─ ডেটা ভ্যালিডেশন সব allocation এর জন্য
   └─ Database Transaction শুরু করুন:
      ├─ Loop প্রতিটি allocation এর জন্য:
      │  ├─ UPDATE materialReceiveItemLocations (ID=201):
      │  │  └─ availableRoll: 70 → 0 (সব ইস্যু করা হয়েছে)
      │  │  └─ availableYds: 350 → 0
      │  ├─ UPDATE materialReceiveItemLocations (ID=202):
      │  │  └─ availableRoll: 30 → 0
      │  │  └─ availableYds: 150 → 0
      │  ├─ INSERT cuttingIssues (প্রতিটি allocation এর জন্য):
      │  │  ├─ Row created: requisitionItemId=1001, allocationId=201, rollQty=70, yds=350
      │  │  └─ Row created: requisitionItemId=1001, allocationId=202, rollQty=30, yds=150
      │  ├─ INSERT stockHistory (প্রতিটি allocation এর জন্য):
      │  │  ├─ Row created: action='issue', batchId=101, allocationId=201, rollQty=70
      │  │  └─ Row created: action='issue', batchId=101, allocationId=202, rollQty=30
      │  └─ [একই প্রক্রিয়া অন্যান্য allocations এর জন্য]
      ├─ UPDATE cuttingRequisitionItems (ID=1001):
      │  └─ issuedRoll: 0 → 100
      │  └─ issuedYds: 0 → 500
      │  └─ status: 'pending' → 'fulfilled' (সব ইস্যু করা হয়েছে)
      ├─ UPDATE cuttingRequisitions (ID=1):
      │  └─ status: 'pending' → 'fulfilled' (সব আইটেম সম্পূর্ণ)
      └─ COMMIT transaction
   
4. BACKEND: ফলাফল রিটার্ন করুন
   └─ Response: আপডেট করা আইটেম

5. FRONTEND: UI আপডেট করুন
   └─ আইটেম স্ট্যাটাস: pending → fulfilled
   └─ issuedRoll: 0 → 100
   └─ Worklist থেকে সরান (fulfilled হয়েছে)

6. Material Stock সাইড: উপলব্ধতা আপডেট
   ├─ API: GET /material-stock?itemCodePdm=ITEM-001&color=Blue
   ├─ availableRoll: 100 → 0 (সব ইস্যু করা হয়েছে)
   └─ UI আপডেট হয়
```

---

## কী পয়েন্টস এবং ডিজাইন নোটস

### 🎯 **গুরুত্বপূর্ণ ডিজাইন সিদ্ধান্ত**

#### 1. **`materialReceiveItemLocations.availableRoll/Yds` হল একমাত্র সত্য উপলব্ধ স্টক**
```
- Material Stock সার্চ এটি পড়ে
- Cutting Issue এটি হ্রাস করে
- স্টক বিতরণের কেন্দ্রবিন্দু
- যদি এটি ভুল হয়, সম্পূর্ণ সিস্টেম ভুল
```

#### 2. **`stockHistory` লেজার সম্পূর্ণ ট্রেসিবিলিটি প্রদান করে**
```
- প্রতিটি গুরুত্বপূর্ণ অপারেশনে লেখা
- ভবিষ্যতে FIFO বাস্তবায়নের জন্য প্রস্তুত
- একটি ব্যাচের সম্পূর্ণ জীবনচক্র দেখা যায়
- অডিট এবং ডিবাগিং এর জন্য অপরিহার্য
```

#### 3. **ব্যাচ স্প্লিটিং: একটি ব্যাচ একাধিক রাকে বিভক্ত হতে পারে**
```
100 Roll ব্যাচ:
- Rack-1: 70 Roll (materialReceiveItemLocations সারি 1)
- Rack-2: 30 Roll (materialReceiveItemLocations সারি 2)

এটি নমনীয়তা প্রদান করে কিন্তু জটিলতাও যোগ করে।
Material Stock সার্চ এটি সঠিকভাবে পরিচালনা করে (প্রতিটি রাক এক লাইন)।
```

#### 4. **MERGE লজিক: একই ব্যাচ, একই রাক**
```
যদি একই ব্যাচ একই রাকে দ্বিতীয়বার রাখা হয়:
- নতুন সারি তৈরি না করে বিদ্যমান সারি আপডেট করা হয়
- rollQty এবং yds যোগ করা হয়
- availableRoll এবং availableYds যোগ করা হয়

এটি duplicate সারি সৃষ্টি প্রতিরোধ করে।
```

#### 5. **স্ট্যাটাস ক্যাসকেড: ব্যাচ → গ্রহণ, রিকোয়েস্ট আইটেম → রিকোয়েস্ট**
```
ব্যাচ স্ট্যাটাস:
- pending → partial → approved (বরাদ্দের সাথে)

গ্রহণ স্ট্যাটাস:
- pending → approved (সব ব্যাচ approved)

রিকোয়েস্ট আইটেম স্ট্যাটাস:
- pending → partial → fulfilled (ইস্যুয়িং এর সাথে)

রিকোয়েস্ট স্ট্যাটাস:
- pending → partial → fulfilled (সব আইটেম fulfilled)

এই ক্যাসকেড লজিক নিশ্চিত করে যে সামগ্রিক স্ট্যাটাস সবসময় সঠিক।
```

#### 6. **নোটিফিকেশন সিস্টেম: `isRead` ফ্ল্যাগ**
```
- নতুন রিকোয়েস্ট তৈরি হলে isRead = false
- গুদাম সাইড: বেল আইকনে অপঠিত গণনা দেখা
- ব্যবহারকারী ক্লিক করে নোটিফিকেশন পড়া
- API: PATCH /cutting-issue/:requisitionId/read → isRead = true
- বেল আইকন অপঠিত গণনা হ্রাস হয়
```

#### 7. **সম্পাদনা সীমাবদ্ধতা: pending অবস্থা শুধুমাত্র**
```
Material Receive:
- যদি status = "approved" → editing ব্লক করা হয়
- কারণ: রাক স্টক আছে, এডিট করলে ডেটা অসঙ্গতি

Cutting Requisition:
- যদি কোনো আইটেম already issued → editing ব্লক করা হয়
- কারণ: ইস্যু হিস্টরি ট্র্যাকিং জটিলতা

এটি ডেটা সততা রক্ষা করে।
```

#### 8. **সম্মতি নিশ্চিত করা: একই Item Code + Color যাচাই**
```
Cutting Issue করার সময়:
- চেক করা হয় যে নির্বাচিত রাক
  এই requisition item এর সাথে একই Item Code + Color রয়েছে
- এটি ভুল রাক থেকে ইস্যু প্রতিরোধ করে
```

### 📊 **ডেটা প্রবাহ সারাংশ**

```
MATERIAL WAREHOUSE সাইড:
1. নতুন মালামাল পেয়েছি?
   → Material Receive তৈরি করুন
   → materialReceives, materialReceiveStyles, materialReceiveItems তৈরি
   → stockHistory → "receive"

2. রাকে রাখা?
   → Location Assignment করুন
   → materialReceiveItemLocations তৈরি করুন
   → materialReceiveItems.unassignedRoll/Yds হ্রাস করুন
   → stockHistory → "location_assignment"

3. স্টক আছে কত?
   → Material Stock সার্চ করুন
   → materialReceiveItemLocations.availableRoll/Yds পড়ুন
   → সারাংশ তৈরি করুন

CUTTING সাইড:
1. মালামাল লাগছে?
   → Cutting Requisition তৈরি করুন
   → cuttingRequisitions, cuttingRequisitionItems তৈরি
   → isRead = false (নোটিফিকেশন)

2. গুদাম স্টক ইস্যু করবে?
   → Worklist দেখুন (GET /cutting-issue)
   → একটি রাক নির্বাচন করুন (GET /material-stock)
   → Issue করুন (POST /cutting-issue/:id/batch)
   → cuttingIssues, stockHistory রেকর্ড করুন
   → materialReceiveItemLocations.availableRoll/Yds হ্রাস করুন
   → cuttingRequisitionItems.issuedRoll/Yds বৃদ্ধি করুন
   → স্ট্যাটাস আপডেট করুন (pending → fulfilled)

3. ইস্যু হিস্টরি দেখুন?
   → History ট্যাব (GET /cutting-issue/history)
   → cuttingIssues সব রেকর্ড পড়ুন
```

### 🔍 **ডাটাবেস কোয়েরি উদাহরণ**

```sql
-- একটি আইটেমের সব রাক অ্যালোকেশন এবং উপলব্ধ স্টক
SELECT id, location, rollQty, yds, availableRoll, availableYds 
FROM materialReceiveItemLocations 
WHERE itemId = 101 
ORDER BY location;

-- একটি ব্যাচের সম্পূর্ণ ইতিহাস
SELECT action, location, rollQty, yds, createdAt, note 
FROM stockHistory 
WHERE batchId = 101 
ORDER BY createdAt DESC;

-- একটি অনুরোধের সমস্ত ইস্যু ট্রানজ্যাকশন
SELECT ci.id, ci.location, ci.rollQty, ci.yds, ci.createdAt,
       cri.itemCodePdm, cri.color,
       cr.buyer, cr.floor, cr.po
FROM cuttingIssues ci
JOIN cuttingRequisitionItems cri ON ci.requisitionItemId = cri.id
JOIN cuttingRequisitions cr ON ci.cuttingRequisitionId = cr.id
WHERE ci.cuttingRequisitionId = 1
ORDER BY ci.createdAt DESC;

-- একটি ব্যাচের মোট উপলব্ধ স্টক
SELECT SUM(availableRoll) as totalAvailableRoll, 
       SUM(availableYds) as totalAvailableYds
FROM materialReceiveItemLocations 
WHERE itemId = 101;
```

---

## সংক্ষেপ

এই ERP সিস্টেম একটি **দুই-পক্ষীয় প্রবাহ**:

1. **Material Warehouse ← Supplier**: নতুন মালামাল গ্রহণ → রাকে রাখা → উপলব্ধ স্টক
2. **Warehouse → Cutting**: অনুরোধ পাওয়া → স্টক ইস্যু → ইস্যু ইতিহাস

প্রতিটি টেবিল একটি নির্দিষ্ট উদ্দেশ্য পরিবেশন করে, এবং `materialReceiveItemLocations` এবং `stockHistory` হল দুটি ভিত্তিবিন্দু যা সম্পূর্ণ ট্রেসিবিলিটি এবং ডেটা অখণ্ডতা নিশ্চিত করে।

প্রতিটি ডেভেলপারের এই সম্পর্কগুলি বোঝা উচিত যাতে তারা নতুন বৈশিষ্ট্য যোগ করতে বা বাগ ঠিক করতে পারে।

---

**ডকুমেন্ট সংস্করণ**: 1.0  
**শেষ আপডেট**: 2024 জানুয়ারি
