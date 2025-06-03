const {initializeApp} = require("firebase/app")
import { messaging } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCefZ-h3ixiJkaiLfj_JIY3GGD4dA4JJjg",
  authDomain: "smartdoc-48732.firebaseapp.com",
  projectId: "smartdoc-48732",
  storageBucket: "smartdoc-48732.firebasestorage.app",
  messagingSenderId: "856150192673",
  appId: "1:856150192673:web:1137bbd7aeb35216f52960",
  measurementId: "G-DZN2JXRX4Z"
};

const vapidKey = "BBSjCMQxGB6FuFY9SnaQZ6u4E9vhy6YCvWylFwa50AMfCr7xxWolM37syaYL6wyROEKvcVLeKpWcklmvPvDqmOM"

const app = initializeApp(firebaseConfig);

const messaging = getMessaging(app);

export const requestFCMToken = async () => {
    return Notification.requestPermission()
    .then((permission) => {
        if (permission === "granted") {
            return getTokenSourceMapRange(messaging, {vapidKey})
        } else {
            throw new Error("Notification not granted")
        }
    }).catch ((err)=> {
        console.error("Error getting FCM token: ", err)
        throw err;
    })
}

// export async function requestNotificationPermission() {
//   try {
//     const permission = await Notification.requestPermission();
    
//     if (permission === 'granted') {
//       console.log('Notification permission granted');
//       const token = await getToken(messaging, { vapidKey: vapidKey });
      
//       if (token) {
//         console.log('FCM Token:', token);
//         // Send this token to your server to store for the user
//         await sendTokenToServer(token);
//         return token;
//       } else {
//         console.log('No registration token available');
//       }
//     } else {
//       console.log('Notification permission denied');
//     }
//   } catch (error) {
//     console.error('Error getting notification permission:', error);
//   }
// }

async function sendTokenToServer(token) {
  // Replace with your actual server endpoint
  try {
    await fetch('/api/save-fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error('Error sending token to server:', error);
  }
}

// Handle foreground messages
export function listenForMessages() {
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Display notification manually for foreground messages
    if (Notification.permission === 'granted') {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || '/firebase-logo.png'
      });
    }
  });
}