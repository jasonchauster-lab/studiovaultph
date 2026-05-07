import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ─────────────────────────────────────────────────────────────
// COMPREHENSIVE KNOWLEDGE BASE FOR STUDIOVAULT CMS
// ─────────────────────────────────────────────────────────────
const knowledgeEntries = [
  // ── DASHBOARD ──
  {
    content: `The Studio Dashboard is the main hub for studio owners. It shows a summary of your studio's performance including total bookings, revenue, active members, and upcoming classes. You can access the dashboard by logging into your studio account at studiovault.local:3000 or your custom domain. The dashboard displays key metrics, recent activity, and quick action buttons.`,
    metadata: { section: 'dashboard', url: '/studio' }
  },

  // ── SCHEDULE MANAGEMENT ──
  {
    content: `Schedule Management lets you create and manage your class schedule. Access it from the sidebar under "Schedule" or navigate to /studio/schedule. Features include:
- Day, Week, and Month calendar views
- Add individual time slots with the "+ Add Slot" button
- Bulk Generate slots to create recurring schedules quickly
- Each slot shows the class name, instructor, capacity, and time
- Click on any slot to edit details, change instructor, or cancel the class
- You can filter the calendar by branch/outlet if you have multiple locations`,
    metadata: { section: 'schedule', url: '/studio/schedule' }
  },
  {
    content: `To add a new class slot: Click "+ Add Slot" on the schedule page. Fill in the class type, instructor, date, start time, end time, and capacity. For studios with multiple outlets/branches, select the correct branch first. The slot will appear on the calendar immediately after saving.`,
    metadata: { section: 'schedule', url: '/studio/schedule' }
  },
  {
    content: `Bulk Generate allows you to create recurring schedules. Select the class type, instructor, days of the week, time range, and date range. The system will automatically generate slots for all selected days within the date range. This is useful for setting up weekly recurring classes.`,
    metadata: { section: 'schedule', url: '/studio/schedule' }
  },

  // ── SERVICES ──
  {
    content: `Services Management is where you define the types of classes or services your studio offers. Navigate to "Services" in the sidebar or go to /studio/services. You can:
- Create new service types (e.g., "Reformer Pilates", "Mat Class", "Private Session")
- Set service descriptions, duration, and category
- Upload cover images for each service
- Enable or disable services without deleting them
- Services are linked to schedule slots when creating classes`,
    metadata: { section: 'services', url: '/studio/services' }
  },

  // ── PRICING & PACKAGES ──
  {
    content: `Pricing Management lets you create membership plans and class packages. Access it from "Pricing" in the sidebar or navigate to /studio/pricing. You can create:
- Drop-in rates (single class pricing)
- Class packages (e.g., 5-class pack, 10-class pack)
- Monthly memberships with unlimited or limited classes
- Set prices, validity periods, and terms
- Each pricing option can be linked to specific services or made available for all services`,
    metadata: { section: 'pricing', url: '/studio/pricing' }
  },

  // ── CUSTOMER MANAGEMENT ──
  {
    content: `Customer Management allows you to view and manage your studio's members and clients. Access it from "Customers" in the sidebar or navigate to /studio/customers. Features include:
- View all registered members with their contact details
- See each customer's booking history and attendance
- Check membership status and package balances
- Search and filter customers by name, email, or status
- Export customer data for marketing or reporting purposes`,
    metadata: { section: 'customers', url: '/studio/customers' }
  },

  // ── STAFF & INSTRUCTORS ──
  {
    content: `Staff Management lets you manage your studio's instructors and staff. Access it from "Staff" in the sidebar or navigate to /studio/staff. You can:
- Add new instructors with their profiles, photos, and specialties
- Assign instructors to specific classes and time slots
- Set instructor availability and working hours
- View instructor schedules and class assignments
- Manage staff roles and permissions within the CMS`,
    metadata: { section: 'staff', url: '/studio/staff' }
  },

  // ── ANALYTICS ──
  {
    content: `Analytics provides insights into your studio's performance. Access it from "Analytics" in the sidebar or navigate to /studio/analytics. Key metrics include:
- Booking trends over time (daily, weekly, monthly)
- Revenue reports and earnings breakdown
- Most popular classes and time slots
- Customer retention and attendance rates
- Instructor performance metrics
- Occupancy rates per class`,
    metadata: { section: 'analytics', url: '/studio/analytics' }
  },

  // ── EARNINGS ──
  {
    content: `The Earnings section shows your studio's financial overview. Access it from "Earnings" in the sidebar or navigate to /studio/earnings. You can:
- View total revenue by period
- See breakdown by payment method
- Track package and membership sales
- Monitor refunds and cancellations
- Export financial reports for accounting`,
    metadata: { section: 'earnings', url: '/studio/earnings' }
  },

  // ── SALES ──
  {
    content: `The Sales section helps you track and manage all transactions. Access it from "Sales" in the sidebar or navigate to /studio/sales. Features include:
- View all completed sales and transactions
- Track pending payments
- Process refunds
- View sales by service type, package, or membership
- Generate sales reports by date range`,
    metadata: { section: 'sales', url: '/studio/sales' }
  },

  // ── INVENTORY / EQUIPMENT ──
  {
    content: `Inventory Management helps you track studio equipment and supplies. Access it from "Inventory" in the sidebar or navigate to /studio/inventory. You can:
- Add and track equipment (reformers, mats, props, etc.)
- Set maintenance schedules for equipment
- Track equipment condition and usage
- Get alerts when equipment needs servicing
- Manage consumable supplies and stock levels`,
    metadata: { section: 'inventory', url: '/studio/inventory' }
  },

  // ── MARKETING & PROMOS ──
  {
    content: `Marketing tools help you promote your studio. Access promotions from "Promo" in the sidebar or navigate to /studio/promo. You can:
- Create discount codes and promotional offers
- Set up seasonal promotions with start and end dates
- Create referral programs for existing members
- Track promo code usage and effectiveness
- The Marketing section (/studio/marketing) provides tools for email campaigns and social media integration`,
    metadata: { section: 'marketing', url: '/studio/promo' }
  },

  // ── REFERRALS ──
  {
    content: `The Referral Program lets your existing members earn rewards by referring new customers. Access it from "Referrals" in the sidebar or navigate to /studio/referrals. Features include:
- Set referral rewards (discounts, free classes, credits)
- Track referral activity and conversions
- Manage referral codes per member
- View referral analytics and top referrers`,
    metadata: { section: 'referrals', url: '/studio/referrals' }
  },

  // ── LOYALTY INSIGHTS ──
  {
    content: `Loyalty Insights provides data about your most valuable customers. Access it from "Loyalty Insights" in the sidebar or navigate to /studio/loyalty-insights. You can:
- Identify your most frequent and loyal members
- Track attendance streaks and engagement
- Set up loyalty rewards and milestone achievements
- Analyze retention patterns and at-risk members`,
    metadata: { section: 'loyalty', url: '/studio/loyalty-insights' }
  },

  // ── ONLINE STORE ──
  {
    content: `The Online Store allows you to sell merchandise, gift cards, and digital products. Access it from "Online Store" in the sidebar or navigate to /studio/online-store. You can:
- Add products with images, descriptions, and pricing
- Manage product categories and inventory
- Process online orders
- Track sales and fulfillment status`,
    metadata: { section: 'online-store', url: '/studio/online-store' }
  },

  // ── WEBSITE BUILDER ──
  {
    content: `The Website Builder lets you customize your studio's public-facing website and storefront. Access it from "Website" in the sidebar or navigate to /studio/website. Features include:
- Customize your studio's landing page design
- Edit hero images, about sections, and contact info
- Manage your service listings displayed to customers
- Set up your booking page for online reservations
- The storefront URL follows the pattern /s/[your-studio-slug]`,
    metadata: { section: 'website', url: '/studio/website' }
  },

  // ── SETTINGS ──
  {
    content: `Studio Settings allow you to configure your studio's profile and preferences. Access it from "Settings" in the sidebar or navigate to /studio/settings. You can:
- Update studio name, description, and contact info
- Set business hours and operating days
- Configure booking rules (advance booking window, cancellation policy)
- Manage payment settings and bank details
- Set up email notifications and preferences
- Configure multi-branch/outlet settings for studios with multiple locations`,
    metadata: { section: 'settings', url: '/studio/settings' }
  },

  // ── MULTI-BRANCH / OUTLETS ──
  {
    content: `For studios with multiple locations (outlets/branches), StudioVault supports multi-branch management. Each branch has its own schedule, staff, and settings. To switch between branches, use the branch selector in the sidebar or schedule page. When adding a new schedule slot, make sure you have the correct branch selected. If your studio has only one branch, it will be auto-selected.`,
    metadata: { section: 'outlets', url: '/studio/settings' }
  },

  // ── BOOKING FLOW (CUSTOMER SIDE) ──
  {
    content: `The customer booking flow works as follows:
1. Customers visit your studio's storefront page (accessible via your custom URL or the marketplace)
2. They browse available classes on your public schedule
3. They select a class and time slot
4. They choose a payment method (drop-in, package, membership)
5. They confirm the booking and receive a confirmation email
6. On the day of class, they check in at your studio (you can use the Scan feature for QR check-in)`,
    metadata: { section: 'booking', url: '/studio/schedule' }
  },

  // ── QR SCAN / CHECK-IN ──
  {
    content: `The Scan feature allows you to check in customers using QR codes. Access it from "Scan" in the sidebar or navigate to /studio/scan. Each booking generates a unique QR code that the customer shows at the studio. Scan the code to mark attendance. This integrates with the booking and attendance tracking systems automatically.`,
    metadata: { section: 'scan', url: '/studio/scan' }
  },

  // ── SUPPORT ──
  {
    content: `If you need human support, you can access the Support section from "Support" in the sidebar. You can create support tickets, view ticket history, and communicate with the StudioVault support team. For urgent issues, email support@studiovaultph.com directly. Common support topics include payment issues, account access problems, and feature requests.`,
    metadata: { section: 'support', url: '/studio/support' }
  },

  // ── REPORTS ──
  {
    content: `The Reports section provides detailed business reports. Access it from "Reports" in the sidebar or navigate to /studio/reports. Available reports include:
- Revenue reports by period
- Booking volume reports
- Customer growth reports
- Class utilization reports
- Staff performance reports
- Reports can be filtered by date range and exported as PDF`,
    metadata: { section: 'reports', url: '/studio/reports' }
  },

  // ── AUTOMATION ──
  {
    content: `The Automation section lets you set up automated workflows for your studio. Access it from "Automation" in the sidebar or navigate to /studio/automation. You can automate:
- Welcome emails for new members
- Booking confirmation and reminder emails
- Membership renewal reminders
- Follow-up messages after classes
- Birthday greetings and special offers`,
    metadata: { section: 'automation', url: '/studio/automation' }
  },

  // ── NAVIGATION GUIDE ──
  {
    content: `The StudioVault CMS sidebar navigation includes these sections (top to bottom):
- Dashboard (home overview)
- Schedule (class calendar)
- Services (class types)
- Pricing (memberships & packages)
- Customers (member management)
- Staff (instructor management)
- Earnings (revenue overview)
- Sales (transaction history)
- Analytics (performance metrics)
- Inventory (equipment tracking)
- Marketing / Promo (promotions)
- Referrals (referral program)
- Loyalty Insights (member engagement)
- Online Store (merchandise)
- Website (storefront builder)
- Reports (business reports)
- Automation (automated workflows)
- Scan (QR check-in)
- Settings (studio configuration)
- Support (help desk)`,
    metadata: { section: 'navigation', url: '/studio' }
  },

  // ── GETTING STARTED ──
  {
    content: `Getting started with StudioVault CMS:
1. Register your studio account at /studio/register
2. Complete the onboarding process (studio name, address, contact details)
3. Add your services (class types you offer)
4. Set up pricing (memberships, packages, drop-in rates)
5. Add your instructors/staff
6. Create your class schedule
7. Customize your public storefront/website
8. Share your booking link with customers
9. Start accepting bookings!`,
    metadata: { section: 'onboarding', url: '/studio/onboarding' }
  },

  // ── HISTORY ──
  {
    content: `The History section shows a log of all actions and changes made in your studio CMS. Access it from "History" in the sidebar or navigate to /studio/history. This includes booking changes, schedule modifications, pricing updates, and admin actions. It serves as an audit trail for your studio operations.`,
    metadata: { section: 'history', url: '/studio/history' }
  },
]

// ─────────────────────────────────────────────────────────────
// SEEDING LOGIC
// ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('🧠 Seeding StudioVault Knowledge Base...')
  console.log(`   ${knowledgeEntries.length} entries to process.\n`)

  // Clear existing entries first
  const { error: deleteError } = await supabase.from('site_knowledge').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
    console.warn('⚠️  Could not clear existing entries (table may be empty):', deleteError.message)
  } else {
    console.log('🗑️  Cleared existing knowledge base entries.\n')
  }

  let successCount = 0
  let errorCount = 0

  for (const entry of knowledgeEntries) {
    try {
      // Generate embedding
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: entry.content,
      })

      const embedding = embeddingRes.data[0].embedding

      // Insert into Supabase
      const { error } = await supabase.from('site_knowledge').insert({
        content: entry.content,
        metadata: entry.metadata,
        embedding,
      })

      if (error) {
        console.error(`   ❌ Failed [${entry.metadata.section}]: ${error.message}`)
        errorCount++
      } else {
        console.log(`   ✅ Inserted: ${entry.metadata.section} (${entry.metadata.url})`)
        successCount++
      }
    } catch (err: any) {
      console.error(`   ❌ Error [${entry.metadata.section}]: ${err.message}`)
      errorCount++
    }
  }

  console.log(`\n🏁 Seeding complete! ${successCount} inserted, ${errorCount} errors.`)
}

seed()
