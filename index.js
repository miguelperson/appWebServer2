const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();
app.use(express.json());
//const cors = require('cors');
//app.use(cors());  // Add this line to allow cross-origin requests

// Connect to MongoDB
mongoose.connect('mongodb+srv://mbacaurteaga:Mabu070899@esapptest1.4nbg7.mongodb.net/ESATestAPp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    thermalStorageUnits: String
});
const User = mongoose.model('User', userSchema, 'users');  // Explicitly set collection name

const sandBatterySchema = new mongoose.Schema({
    batteryID: String, // unique identifier for sand storage
    currentRoomTemp: Number, // ESP32 using DHT11's for reading external room temp
    currentInternalTemp: Number, // ESP32 reading insulated sand temperature
    setRoomTemp: Number, // desired room temperature to heat to
    heatingRoom: Boolean, // whether the sand thermal storage is currently heating the room or not
    ChargingBoolean: Boolean, // whether the sand is currently being heated
    startChargingHour: Number,
    endChargingHour: Number,
    startHeatingHour: Number,
    endHeatingHour: Number,
    startChargingMinute: Number,
    stopChargingMinute: Number,
    startHeatingMinute: Number,
    stopHeatingMinute: Number,
    heatingToggleFlag: Boolean,
    chargingToggleFlag: Boolean,
    name: String,
    schedulingFlag: Boolean
    // going to want to add toggle flags for the sand battery
});
const SandBattery = mongoose.model('SandBattery', sandBatterySchema, 'sandBatteries');

app.post('/newBattery', async (req, res) => { // api end point used by ESP32-WROOM-32 to register
    const { batteryID, currentRoomTemp, currentInternalTemp, setRoomTemp, heatingRoom, ChargingBoolean, startChargingHour, endChargingHour, startHeatingHour, endHeatingHour, startChargingMinute, stopChargingMinute, startHeatingMInute, stopHeatingMinute, heatingToggleFlag, chargingToggleFlag, schedulingFlag } = req.body;
    const additionalBattery = new SandBattery({
        batteryID,
        currentRoomTemp,
        currentInternalTemp,
        setRoomTemp,
        heatingRoom,
        ChargingBoolean,
        startChargingHour,
        endChargingHour,
        startHeatingHour,
        endHeatingHour,
        startChargingMinute,
        stopChargingMinute,
        startHeatingMInute,
        stopHeatingMinute,
        heatingToggleFlag,
        chargingToggleFlag,
        schedulingFlag
    });
    try {
        await additionalBattery.save();
        return res.status(201).json({ message: 'battery registered' });
    } catch (error) {
        return res.status(500).json({ message: 'Error registering user', error });
    }
});

app.post('/registerBattery', async (req, res) => {
    const { name, batteryID, user } = req.body;
    console.log(name + " " + batteryID + " " + user);
    try {
        const existingBattery = await SandBattery.findOne({ batteryID }); // checking if battery exists
        if (existingBattery) {
            console.log("found TDES: "+batteryID);
            const cleanedEmail = user.trim().toLowerCase();
            const existingUser = await User.findOne({ email: cleanedEmail }); // searches for user
            if (existingUser) {
                console.log("found user: " + existingUser);
                existingUser.thermalStorageUnits = batteryID;
                existingBattery.name = name;
                await existingUser.save();
                await existingBattery.save();
                return res.status(200).json({ message: 'Battery Successfully Registered' });
            }
        } else {
            return res.status(500).json({ message: 'Battery Not Found' })
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error registering TDES', error });
        }
});

// Check if batteryID already exists
app.get('/checkBattery', async (req, res) => {
    const { batteryID } = req.body; // Get batteryID from the query string
    try {
        const existingBattery = await SandBattery.findOne({ batteryID });
        if (existingBattery) {
            return res.status(200).json({ exists: true });
        } else {
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error searching for battery', error });
    }
});

app.get('/batteryStatus', async (req, res) => { // will need expansion for future cosmetic shit
    const { email } = req.query;
    try {
        const user = await User.findOne({ email: email });
        if (!user)
            return res.status(404).json({ message: 'User cannot be foudn' });

        const batteryID = user.thermalStorageUnits; // technically searching for the battery name but whatever
        if (!batteryID)
            return res.status(404).json({ message: 'No battery linked' });

        const battery = await SandBattery.findOne({ batteryID: batteryID }); // searching battery ID's for the batteryID variable
        if (!battery)
            return res.status(404).json({ message: 'No battery foudn' });

        // console.log("room temp set is " + battery.setRoomTemp);

        res.json({ // this goes back to the andorid, might have to update for the future front end development
            batteryName: battery.name,
            currentInternalTemp: battery.currentInternalTemp,
            currentRoomTemp: battery.currentRoomTemp,
            setRoomTemp: battery.setRoomTemp
        });
    } catch (error) {
        console.error("Error fetchiing battery status: ", error);
        res.status(500).json({ message: 'Error fetching battery status', error });
    }
});


    //    startHeatingHour: Number,
      //      endHeatingHour: Number,
          //          stopChargingMinute: Number,
            //            startHeatingMinute: Number,
              //              stopHeatingMinute: Number,

app.get('/TDESToggleCheck', async (req, res) => { // ESP32 code
    const { batteryID } = req.query; // Only extract from query
    console.log("Received request to checkBattery for batteryID: ");

    try {
        const battery = await SandBattery.findOne({ batteryID });
        if (!battery) {
            console.log("Battery not found");
            return res.status(404).json({ exists: false, message: 'Battery not found' });
        }

        const heatingToggleFlag = battery.heatingToggleFlag;
        const chargingToggleFlag = battery.chargingToggleFlag;
        const scheduleFlag = battery.scheduleFlag;

        // const startChargingHour = battery.startChargingHour;
        //const startChargingMinute = battery.startChargingMinute;
        //const stopChargingHour = battery.endChargingHour;
        //const stopChargingMinute = battery.stopChargingMinute;

        // Reset the flags
        battery.heatingToggleFlag = false;
        battery.chargingToggleFlag = false;
        battery.scheduleFlag = false;
        await battery.save();

        // Return JSON response
        return res.status(200).json({
            exists: true,
            heatingToggleFlag: heatingToggleFlag,
            chargingToggleFlag: chargingToggleFlag,
            scheduleFlag: scheduleFlag
        });

    } catch (error) {
        console.error("Error checking battery: ", error);
        return res.status(500).json({ exists: false, message: 'Error checking battery', error: error.toString() });
    }
});

app.get('/TDESGetSchedule', async (req, res) => {
    const { batteryID } = req.query;
    try {
        const battery = await SandBattery.findOne({ batteryID });
        if (!battery) {
            console.log("couldnt' find battery for schedule");
            return res.status(404).json({ exists: false, message: "battery not foudn for schedule" });
        }
        const heatStartHour = battery.startHeatingHour; // times have to be in military time
        const heatEndHour = battery.endHeatingHour;
        const startHeatingMinute = battery.startHeatingMinute;
        const stopHeatingMinute = battery.stopHeatingMinute;

        const startChargingHour = battery.startChargingHour;
        const endChargingHour = battery.endChargingHour;
        const startChargingMinute = battery.startChargingMinute;
        const endChargingMinute = battery.endChargingMinute;

        return res.status(200).json({
            exists: true,
            heatStartHour: heatStartHour,
            heatEndHour: heatEndHour,
            startheatingMinute: startHeatingMinute,
            stopHeatingMinute: stopHeatingMinute,
            startChargingHour: startChargingHour,
            endChargingHour: endChargingHour,
            startChargingMinute: startChargingMinute,
            endChargingMinute: endChargingMinute
        })
    } catch (error) {
        console.error("Error Getting Schedule", error);
        return res.status(500).json({ exists: false, message: 'Error getting schedule', error: error.toString() });

    }
});


app.post('/appHeatToggle', async (req, res) => { // app toggle for current heating statusa
    const { user } = req.body; // given ID to find and then given the value for the toggle flag
    const userObject = await User.findOne({ email: user }); // added type to email
    const batteryID = userObject.thermalStorageUnits
    const existingBattery = await SandBattery.findOne({ batteryID }); // finds the battery in the database

    if (existingBattery) {
        existingBattery.heatingToggleFlag = true; // raise heating flag
        await existingBattery.save();
        const flip = !existingBattery.heatingToggleFlag;
        return res.status(200).json({ message: flip.toString() });
    } else {
        return res.status(500).json({ message: ' unable to find the battery' });
    }
});

app.post('/appChargingToggle', async (req, res) => { // toggle for the 
    const { user } = req.body; // given ID to find and then given the value for the toggle flag
    const userObject = await User.findOne({ email: user }); // added type to email
    const batteryID = userObject.thermalStorageUnits
    const existingBattery = await SandBattery.findOne({ batteryID }); // finds the battery in the database

    if (existingBattery) {
        existingBattery.chargingToggleFlag = true; // raise heating flag
        await existingBattery.save();
        const flip = !existingBattery.ChargingBoolean;
        return res.status(200).json({ message: flip.toString() }); // notifies app of the current charging state
    } else {
        return res.status(500).json({ message: ' unable to find the battery' });
    }
});

app.post('/batteryUpdate', async (req, res) => { // updating values of ESP32
    const { batteryID, currentRoomTemp, currentInternalTemp, setRoomTemp, heatingRoom, ChargingBoolean, finalStartHeating, finalEndHeating, finalStartCharging, finalEndCharging  } = req.body;
    console.log("starting battery Update");
    console.log(finalStartHeating);

    try {
        // Find the existing battery by batteryID
        const existingBattery = await SandBattery.findOne({ batteryID });

        if (existingBattery) {
            // Update the values
            if (currentRoomTemp !== undefined)
                existingBattery.currentRoomTemp = currentRoomTemp;
            if (currentInternalTemp !== undefined)
                existingBattery.currentInternalTemp = currentInternalTemp;
            if (setRoomTemp !== undefined)
                existingBattery.setRoomTemp = setRoomTemp;
            if (heatingRoom !== undefined)
                existingBattery.heatingRoom = heatingRoom;
            if (ChargingBoolean !== undefined)
                existingBattery.ChargingBoolean = ChargingBoolean;
            if (finalStartHeating !== undefined)
                existingBattery.finalStartHeating = finalStartHeating;
            if (finalEndHeating !== undefined)
                existingBattery.finalEndHeating = finalEndHeating;
            if (finalStartCharging !== undefined)
                existingBattery.finalStartCharging = finalStartCharging;
            if (finalEndCharging !== undefined) {
                existingBattery.finalEndCharging = finalEndCharging;
                existingBattery.startHeatingMinute = 0;
                existingBattery.stopHeatingMinute = 0;
                existingBattery.startChargingMinute = 0;
                existingBattery.stopChargingMinute = 0;
            } // last if statement just to reset the minutes of all the components

            await existingBattery.save(); // save changes to found battery

            return res.status(200).json({ message: 'Battery updated successfully' });
        } else {
            return res.status(404).json({ message: 'Battery not found' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error updating battery', error });
    }
});


// post route from the registration page
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log("registering user");
    const existingUser = await User.findOne({ email }); // check database if email is already registerd
    if (existingUser)
        return res.status(400).json({ message: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("creating new user accoutn");
    const newUser = new User({
        email,
        password: hashedPassword
        // thermalStorageUnits: "" aaaaaaa
    });

    try {
        await newUser.save(); // saves new user to database
        return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error regsitering user', error });
    }
});



// Test GET route (to verify if the server is responding)
app.get('/test', (req, res) => {
    res.send('Server is reachable and running');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Trim email and convert to lowercase for case-insensitive matching
    const cleanedEmail = email.trim().toLowerCase();

    // Log the email to check what's being queried
    console.log('Querying for email:', cleanedEmail);

    // Find user in MongoDB with case-insensitive query
    const user = await User.findOne({ email: cleanedEmail });

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    // Check if the password matches (assuming the password is hashed in the database)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    return res.status(200).json({ message: 'Login successful', email: user.email }); // returning the user email as well
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));