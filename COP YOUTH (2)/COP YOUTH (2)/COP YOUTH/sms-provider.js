// SMS Provider Integration - ARKESEL CONFIGURATION
// This file handles SMS sending through Arkesel (Ghana SMS Provider)

// ==================== ARKESEL CONFIGURATION ====================
// Get your credentials from: https://sms.arkesel.com/

// STEP 1: Replace these with your actual Arkesel credentials
const ARKESEL_API_KEY = 'YOUR_ARKESEL_API_KEY';           // Your Arkesel API Key
const ARKESEL_SENDER_ID = 'Youthflow';               // Your Sender ID (e.g., 'COP Youth')

// STEP 2: Set your default country code for phone number formatting
const DEFAULT_COUNTRY_CODE = '233'; // Ghana = 233

// ==================== LEGACY TWILIO CONFIGURATION (BACKUP) ====================
// Keep these for reference or as backup option
const TWILIO_ACCOUNT_SID = 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_PHONE_NUMBER = 'YOUR_TWILIO_PHONE_NUMBER';

// ==================== ARKESEL SMS FUNCTION ====================

async function sendSMSViaArkesel(phoneNumber, message) {
    try {
        // Check if Arkesel is configured
        if (ARKESEL_API_KEY === 'YOUR_ARKESEL_API_KEY' ||
            ARKESEL_SENDER_ID === 'YOUR_SENDER_ID') {
            console.warn('⚠️ Arkesel credentials not configured. Running in DEMO MODE.');
            return {
                success: true,
                demo: true,
                messageId: 'DEMO-' + Date.now(),
                message: 'Demo mode - SMS not actually sent. Please configure Arkesel credentials.',
                provider: 'arkesel'
            };
        }

        // Format phone number for Ghana
        let formattedPhone = phoneNumber.trim();

        // Remove spaces, dashes, and parentheses
        formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

        // Remove leading 0 if present
        if (formattedPhone.startsWith('0')) {
            formattedPhone = formattedPhone.substring(1);
        }

        // Remove + and country code if present
        if (formattedPhone.startsWith('+233')) {
            formattedPhone = formattedPhone.substring(4);
        } else if (formattedPhone.startsWith('233')) {
            formattedPhone = formattedPhone.substring(3);
        }

        // Arkesel expects format: 0XXXXXXXXX
        formattedPhone = '0' + formattedPhone;

        console.log('📱 Sending SMS via Arkesel to:', formattedPhone);

        // Prepare request body for Arkesel API
        const requestBody = {
            sender: ARKESEL_SENDER_ID,
            message: message,
            recipients: [formattedPhone]
        };

        // Make API request to Arkesel
        const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
            method: 'POST',
            headers: {
                'api-key': ARKESEL_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('Arkesel API Response:', data);

        // Check if request was successful
        if (response.ok && data.code === '1000') {
            console.log('✅ SMS sent successfully via Arkesel!');
            return {
                success: true,
                messageId: data.data?.message_id || Date.now().toString(),
                status: 'sent',
                to: formattedPhone,
                from: ARKESEL_SENDER_ID,
                balance: data.data?.balance,
                cost: data.data?.cost,
                provider: 'arkesel'
            };
        } else {
            console.error('❌ Arkesel API Error:', data);
            return {
                success: false,
                error: data.message || 'Failed to send SMS',
                errorCode: data.code,
                provider: 'arkesel'
            };
        }
    } catch (error) {
        console.error('❌ Arkesel SMS Error:', error);
        return {
            success: false,
            error: error.message || 'Network error occurred',
            provider: 'arkesel'
        };
    }
}

// ==================== TWILIO SMS FUNCTION (BACKUP) ====================

async function sendSMSViaTwilio(phoneNumber, message) {
    try {
        // Check if Twilio is configured
        if (TWILIO_ACCOUNT_SID === 'YOUR_TWILIO_ACCOUNT_SID' ||
            TWILIO_AUTH_TOKEN === 'YOUR_TWILIO_AUTH_TOKEN' ||
            TWILIO_PHONE_NUMBER === 'YOUR_TWILIO_PHONE_NUMBER') {
            console.warn('⚠️ Twilio credentials not configured.');
            return {
                success: false,
                error: 'Twilio not configured',
                provider: 'twilio'
            };
        }

        // Format phone number to E.164 format (required by Twilio)
        let formattedPhone = phoneNumber.trim();

        // Remove spaces, dashes, and parentheses
        formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

        // Add country code if missing
        if (!formattedPhone.startsWith('+')) {
            // Remove leading 0 if present
            if (formattedPhone.startsWith('0')) {
                formattedPhone = formattedPhone.substring(1);
            }
            // Add country code
            formattedPhone = '+' + DEFAULT_COUNTRY_CODE + formattedPhone;
        }

        console.log('📱 Sending SMS via Twilio to:', formattedPhone);

        // Create Basic Authentication header
        const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        // Prepare request body
        const body = new URLSearchParams({
            To: formattedPhone,
            From: TWILIO_PHONE_NUMBER,
            Body: message
        });

        // Make API request to Twilio
        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: body.toString()
            }
        );

        const data = await response.json();

        console.log('Twilio API Response:', data);

        // Check if request was successful
        if (response.ok) {
            console.log('✅ SMS sent successfully! Message SID:', data.sid);
            return {
                success: true,
                messageId: data.sid,
                status: data.status,
                to: data.to,
                from: data.from,
                price: data.price,
                priceUnit: data.price_unit,
                provider: 'twilio'
            };
        } else {
            console.error('❌ Twilio API Error:', data);
            return {
                success: false,
                error: data.message || 'Failed to send SMS',
                errorCode: data.code,
                moreInfo: data.more_info,
                provider: 'twilio'
            };
        }
    } catch (error) {
        console.error('❌ Twilio SMS Error:', error);
        return {
            success: false,
            error: error.message || 'Network error occurred',
            provider: 'twilio'
        };
    }
}

// ==================== MAIN SMS FUNCTION ====================

async function sendSMS(phoneNumber, message) {
    // Validate inputs
    if (!phoneNumber || !message) {
        return {
            success: false,
            error: 'Phone number and message are required'
        };
    }

    // Validate message length (160 characters for single SMS)
    if (message.length > 160) {
        console.warn('⚠️ Message exceeds 160 characters. This will be sent as multiple SMS segments.');
    }

    // Send via Arkesel (primary provider)
    return await sendSMSViaArkesel(phoneNumber, message);

    // To use Twilio instead, uncomment this line and comment the line above:
    // return await sendSMSViaTwilio(phoneNumber, message);
}

// ==================== BULK SMS FUNCTION ====================

async function sendBulkSMS(recipients, message) {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    console.log(`📤 Sending bulk SMS to ${recipients.length} recipients...`);

    for (const recipient of recipients) {
        // Replace {name} placeholder with actual name
        const personalizedMessage = message.replace('{name}', recipient.name);

        // Send SMS
        const result = await sendSMS(recipient.phone, personalizedMessage);

        results.push({
            recipient: recipient.name,
            phone: recipient.phone,
            ...result
        });

        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }

        // Small delay to avoid rate limiting (Twilio allows 1 message per second on trial)
        await new Promise(resolve => setTimeout(resolve, 1100));
    }

    console.log(`✅ Bulk SMS complete: ${successCount} successful, ${failCount} failed`);

    return {
        success: successCount > 0,
        total: recipients.length,
        successful: successCount,
        failed: failCount,
        results: results
    };
}

// ==================== CONFIGURATION CHECK ====================

function checkSMSConfiguration() {
    const arkeselConfigured =
        ARKESEL_API_KEY !== 'YOUR_ARKESEL_API_KEY' &&
        ARKESEL_SENDER_ID !== 'YOUR_SENDER_ID' &&
        ARKESEL_API_KEY.length > 0 &&
        ARKESEL_SENDER_ID.length > 0;

    const twilioConfigured =
        TWILIO_ACCOUNT_SID !== 'YOUR_TWILIO_ACCOUNT_SID' &&
        TWILIO_AUTH_TOKEN !== 'YOUR_TWILIO_AUTH_TOKEN' &&
        TWILIO_PHONE_NUMBER !== 'YOUR_TWILIO_PHONE_NUMBER' &&
        TWILIO_ACCOUNT_SID.length > 0 &&
        TWILIO_AUTH_TOKEN.length > 0 &&
        TWILIO_PHONE_NUMBER.length > 0;

    return {
        provider: arkeselConfigured ? 'arkesel' : (twilioConfigured ? 'twilio' : 'none'),
        configured: arkeselConfigured || twilioConfigured,
        arkesel: arkeselConfigured,
        twilio: twilioConfigured,
        message: arkeselConfigured
            ? '✅ Arkesel is configured and ready to send SMS'
            : (twilioConfigured
                ? '✅ Twilio is configured (backup provider)'
                : '⚠️ No SMS provider configured. Please update sms-provider.js with your Arkesel or Twilio credentials.')
    };
}

// ==================== TEST FUNCTION ====================

async function testSMSConfiguration(testPhoneNumber) {
    console.log('🧪 Testing SMS Configuration...');

    const configStatus = checkSMSConfiguration();
    console.log('Configuration Status:', configStatus);

    if (!configStatus.configured) {
        console.warn('⚠️ No SMS provider configured. Please add your credentials first.');
        alert('⚠️ SMS Provider not configured!\n\nPlease update sms-provider.js with your:\n\nFor Arkesel:\n1. API Key\n2. Sender ID\n\nFor Twilio:\n1. Account SID\n2. Auth Token\n3. Phone Number');
        return false;
    }

    if (testPhoneNumber) {
        console.log('📱 Sending test SMS to:', testPhoneNumber);
        const result = await sendSMS(
            testPhoneNumber,
            `Test message from Church Youth Management System. ${configStatus.provider.toUpperCase()} is working! 🎉`
        );

        console.log('Test Result:', result);

        if (result.success && !result.demo) {
            alert(`✅ Test SMS sent successfully via ${result.provider.toUpperCase()}!\n\nCheck your phone for the message.`);
            return true;
        } else if (result.demo) {
            alert(`⚠️ Running in DEMO MODE\n\nPlease configure your ${configStatus.provider.toUpperCase()} credentials to send real SMS.`);
            return false;
        } else {
            alert(`❌ Test SMS failed!\n\nProvider: ${result.provider}\nError: ${result.error}\n\nCheck the console for more details.`);
            return false;
        }
    }

    return true;
}

// ==================== EXPORT FUNCTIONS ====================
// Make functions available globally
window.sendSMS = sendSMS;
window.sendBulkSMS = sendBulkSMS;
window.checkSMSConfiguration = checkSMSConfiguration;
window.testSMSConfiguration = testSMSConfiguration;

// Log configuration status on page load
const smsConfig = checkSMSConfiguration();
console.log('📱 SMS Provider loaded:', smsConfig);
console.log(`💡 Active Provider: ${smsConfig.provider.toUpperCase()}`);
console.log('💡 To test SMS, open browser console and run: testSMSConfiguration("0XXXXXXXXX")');
