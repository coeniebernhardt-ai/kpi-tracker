import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client (SERVICE ROLE KEY)
// Try both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env file or environment variables.')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

// Generate a secure random password
function generatePassword(name) {
  // Get initials from name (first letter of first and last name)
  const nameParts = name.split(' ')
  const initials = nameParts.length >= 2 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : nameParts[0].substring(0, 2).toUpperCase()
  
  // Generate random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  
  // Format: Initials + Year + Random + Special char
  return `${initials}2024${randomNum}!`
}

async function getAllProfiles() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .order('full_name')
  
  if (error) {
    console.error('Error fetching profiles:', error)
    return []
  }
  
  return data || []
}

async function getUserByEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  
  if (error) {
    console.error('Error listing users:', error)
    return null
  }
  
  return data.users.find(user => user.email === email) || null
}

async function createOrUpdatePassword(email, password, fullName) {
  try {
    // Check if user exists in auth
    const user = await getUserByEmail(email)
    
    if (!user) {
      console.log(`⚠️  User not found in auth.users: ${email} (${fullName})`)
      return { success: false, reason: 'User not found in auth' }
    }
    
    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    )
    
    if (updateError) {
      console.error(`❌ Failed to update ${email}:`, updateError.message)
      return { success: false, reason: updateError.message }
    }
    
    return { success: true, email, password, fullName }
  } catch (error) {
    console.error(`❌ Error processing ${email}:`, error.message)
    return { success: false, reason: error.message }
  }
}

async function run() {
  console.log('🔐 Starting password creation for all members...\n')
  
  // Get all profiles
  const profiles = await getAllProfiles()
  
  if (profiles.length === 0) {
    console.log('❌ No profiles found in database')
    return
  }
  
  console.log(`📋 Found ${profiles.length} profiles\n`)
  
  const results = []
  const passwordList = []
  
  // Process each profile
  for (const profile of profiles) {
    const password = generatePassword(profile.full_name)
    const result = await createOrUpdatePassword(profile.email, password, profile.full_name)
    
    if (result.success) {
      results.push(result)
      passwordList.push({
        name: profile.full_name,
        email: profile.email,
        password: password
      })
      console.log(`✅ Password set for: ${profile.full_name} (${profile.email})`)
    } else {
      console.log(`❌ Failed: ${profile.full_name} (${profile.email}) - ${result.reason}`)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total profiles: ${profiles.length}`)
  console.log(`Passwords set: ${results.length}`)
  console.log(`Failed: ${profiles.length - results.length}`)
  
  // Display password list
  console.log('\n' + '='.repeat(60))
  console.log('🔑 PASSWORD LIST')
  console.log('='.repeat(60))
  console.log('\n')
  
  passwordList.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}`)
    console.log(`   Email: ${item.email}`)
    console.log(`   Password: ${item.password}`)
    console.log('')
  })
  
  // Also save to a text file format
  const textOutput = passwordList.map(item => 
    `${item.name} | ${item.email} | ${item.password}`
  ).join('\n')
  
  console.log('\n' + '='.repeat(60))
  console.log('📄 COPY-PASTE FORMAT:')
  console.log('='.repeat(60))
  console.log(textOutput)
  
  console.log('\n✅ Done.')
}

run().catch(console.error)
