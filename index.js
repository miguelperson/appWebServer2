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
    thermalStorageUnits: [String]
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
    chargingToggleFlag: Boolean
    // going to want to add toggle flags for the sand battery
});
const SandBattery = mongoose.model('SandBattery', sandBatterySchema, 'sandBatteries');

app.post('/newBattery', async (req, res) => { // api end point used by ESP32-WROOM-32 to register
    const { batteryID, currentRoomTemp, currentInternalTemp, setRoomTemp, heatingRoom, ChargingBoolean, startChargingHour, endChargingHour, startHeatingHour, endHeatingHour, startChargingMinute, stopChargingMinute, startHeatingMInute, stopHeatingMinute, heatingToggleFlag, chargingToggleFlag } = req.body;
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
        chargingToggleFlag
    });
    try {
        await additionalBattery.save();
        return res.status(201).json({ message: 'battery registered' });
    } catch (error) {
        return res.status(500).json({ message: 'Error registering user', error });
    }
});

// Check if batteryID already exists
app.get('/checkBattery', async (req, res) => {
    const { batteryID } = req.query; // Get batteryID from the query string
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

app.post('/appHeatToggle', async (req, res) => { // toggle for the 
    const { batteryID, chargingToggleFlag } = req.body; // given ID to find and then given the value for the toggle flag
    const existingBattery = await SandBattery.findOne({ batteryID }); // finds the battery in the database
    if (existingBattery) {
        existingBattery.chargingToggleFlag = !existingBattery.chargingToggleFlag; // toggle the heating flag
        await existingBattery.save();
        return res.status(200).json({ message: 'toggle set to:' + existingBattery.chargingToggleFlag });
    } else {
        return res.status(500).json({ message: ' unable to find the battery' });
    }
});

app.post('/appChargingToggle', async (req, res) => { // toggle for the 
    const { batteryID, heatingToggleFlag } = req.body; // given ID to find and then given the value for the toggle flag
    const existingBattery = await SandBattery.findOne({ batteryID }); // finds the battery in the database
    if (existingBattery) {
        existingBattery.heatingToggleFlag = !existingBattery.heatingToggleFlag; // toggle the heating flag
        await existingBattery.save();
        return res.status(200).json({ message: 'toggle set to:' + existingBattery.heatingToggleFlag });
    } else {
        return res.status(500).json({ message: ' unable to find the battery' });
    }
});

app.post('/batteryUpdate', async (req, res) => { // updating values of ESP32
    const { batteryID, currentRoomTemp, currentInternalTemp, setRoomTemp, heatingRoom, ChargingBoolean } = req.body;

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

    const existingUser = await User.findOne({ email }); // check database if email is already registerd
    if (existingUser)
        return res.status(400).json({ message: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        email,
        password: hashedPassword
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