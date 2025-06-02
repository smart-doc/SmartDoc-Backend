const {initializeApp} = require("firebase/app")

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