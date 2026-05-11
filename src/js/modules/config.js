export const CONFIG = {
    firebase: {
        apiKey: "AIzaSyASCF3rzBkBIPGbN-W63KgYVPCuZ2hZi7I",
        authDomain: "bustrackernaimur.firebaseapp.com",
        databaseURL: "https://bustrackernaimur-default-rtdb.firebaseio.com",
        projectId: "bustrackernaimur",
        storageBucket: "bustrackernaimur.firebasestorage.app",
        messagingSenderId: "253035446783",
        appId: "1:253035446783:web:58edcbbb0d5453407467ca",
        measurementId: "G-8C2YD6EWJT"
    },
    paths: {
        locations: 'locations',
        presence: 'presence'
    },
    uiuCoords: [23.79790, 90.44970], 
    presenceInterval: 15000,
    minAccuracy: 50
};

export const BUS_STYLES = {
    'K': 'bg-blue-500',   // Kuril - Blue
    'N': 'bg-green-500',  // Notun Bazar - Green
    'A': 'bg-purple-500', // Aftab Nagar - Purple
    'default': 'bg-orange-500',
    'to_uiu': 'bg-green-600',
    'from_uiu': 'bg-red-600'
};
