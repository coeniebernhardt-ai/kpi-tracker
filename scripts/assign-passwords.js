import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client (SERVICE ROLE KEY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Users and passwords to assign
const users = [
  { email: 'lucas@td.dev', password: 'TempPassword123!' },
  { email: 'andreas@thinkdigital.co.za', password: 'TempPassword123!' },
  { email: 'cornett@td.dev', password: 'TempPassword123!' },
  { email: 'lisandro@td.dev', password: 'TempPassword123!' },
  { email: 'marcellus.hoods@td.dev', password: 'TempPassword123!' }
]

async function run() {
  console.log('Starting password assignment...\n')

  for (const user of users) {
    const { data, error } =
      await supabaseAdmin.auth.admin.getUserByEmail(user.email)

    if (error || !data?.user) {
      console.log(`User not found: ${user.email}`)
      continue
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { password: user.password }
      )

    if (updateError) {
      console.log(`Failed to update ${user.email}`)
    } else {
      console.log(`Password set for ${user.email}`)
    }
  }

  console.log('\nDone.')
}

run()
