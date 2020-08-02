const firebase = require("firebase/app");
// Required for side-effects
require("firebase/firestore");

class Fire {
	constructor() {
		try {
			firebase.initializeApp({
				apiKey: "AIzaSyA_Twm-6rcyOkaRuoflwbXbrOLvyMMSBIE",
				authDomain: "redcarpetup-16092.firebaseapp.com",
				databaseURL: "https://redcarpetup-16092.firebaseio.com",
				projectId: "redcarpetup-16092",
				storageBucket: "redcarpetup-16092.appspot.com",
				messagingSenderId: "837074208214",
				appId: "1:837074208214:web:8a83bb028bff44a8e4d077"
			});
		} catch ({ message }) {
			console.log(message);
		}
	}
}

new Fire();
export default Fire;
