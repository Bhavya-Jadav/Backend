// Create user via production API (bypasses IP whitelist issue)
const fetch = require('node-fetch');

const createUserViaAPI = async () => {
  try {
    console.log('🚀 Creating user via production API...');
    
    // YOUR CREDENTIALS - Update these
    const userData = {
      username: 'jadav',              // Your actual username
      password: 'your_password',      // Your actual password
      email: 'jadav@example.com',     // Your actual email
      role: 'student'                 // or 'company'
    };

    const response = await fetch('https://backend-production-2368.up.railway.app/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ User created successfully!');
      console.log('📧 Username:', userData.username);
      console.log('🎯 You can now login with your credentials on production');
    } else {
      console.log('❌ Error:', result.message);
      if (result.message.includes('already exists')) {
        console.log('✅ User already exists - you can login now!');
      }
    }

  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
};

createUserViaAPI();
