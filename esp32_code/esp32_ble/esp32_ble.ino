#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <Preferences.h>

// ================== BLE SETUP ==================
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// UUIDs (same as your React app)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ================== GPS MODULE ==================
TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // Use UART2 (RX=16, TX=17 on ESP32)
float currentLat = 17.390555;
float currentLng = 78.321944;
int currentHeading = 0;

// ================== BATTERY SIMULATION ==================
Preferences preferences;
float currentBattery = 80.0; // 40V on a 42V max system is approx 80%
int lastSavedBattery = 80;

// ================== HALL SENSOR ==================
const int HALL_A_PIN = 34;
const int HALL_B_PIN = 35;
const int HALL_C_PIN = 32;

// --- CALIBRATION FIX ---
// Because we are now using 3 Hall sensors instead of 1, we get 3 times as many pulses per rotation!
// Your previous accurate calibration of 70 is multiplied by 3 = 210.
const float pulsePerRev = 210.0; 

const float wheelDiameter = 0.66; // 26 inch in meters

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;

unsigned long lastMillis = 0;

// ================== ISR ==================
void IRAM_ATTR handlePulse() {
  unsigned long now = micros();

  // Debounce filter (Increased to 500 micros to prevent PWM electrical noise from causing speed jumps at low acceleration)
  if (now - lastPulseTime > 500) {
    pulseCount++;
    lastPulseTime = now;
  }
}

// ================== BLE CALLBACK ==================
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Dashboard Connected via BLE!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Dashboard Disconnected.");
    }
};

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);

  // Hall sensors
  pinMode(HALL_A_PIN, INPUT_PULLDOWN);
  pinMode(HALL_B_PIN, INPUT_PULLDOWN);
  pinMode(HALL_C_PIN, INPUT_PULLDOWN);
  
  attachInterrupt(digitalPinToInterrupt(HALL_A_PIN), handlePulse, RISING);
  attachInterrupt(digitalPinToInterrupt(HALL_B_PIN), handlePulse, RISING);
  attachInterrupt(digitalPinToInterrupt(HALL_C_PIN), handlePulse, RISING);

  // GPS init
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17); // Most GPS modules use 9600 baud rate. RX=16, TX=17
  Serial.println("GPS Serial Started on RX=16, TX=17");

  // Battery memory init
  preferences.begin("ev_dash", false); // Open NVS namespace
  // UNCOMMENT the line below and re-upload if you ever want to force reset the battery to 100% after charging!
  // preferences.putFloat("batt", 100.0); 
  currentBattery = preferences.getFloat("batt", 80.0);
  lastSavedBattery = (int)currentBattery;
  Serial.printf("Loaded Battery from Memory: %d%%\n", lastSavedBattery);

  // BLE init
  BLEDevice::init("EV Bicycle");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();

  Serial.println("BLE + Speed Monitor Started...");
  Serial.println("Spin wheel exactly 1 time to calibrate if speed is wrong!");
}

// ================== LOOP ==================
void loop() {

  // Read GPS continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastMillis >= 1000) {

    // Copy pulse safely
    noInterrupts();
    unsigned long count = pulseCount;
    pulseCount = 0;
    interrupts();

    // ================== CALCULATE ==================
    // RPM of the actual physical wheel
    float rpm = (count * 60.0) / pulsePerRev;
    
    // Speed = RPM * Circumference(pi*d) * 60 minutes / 1000 meters
    float speed = (rpm * 3.1416 * wheelDiameter * 60.0) / 1000.0;
    
    // Clean up small noise (if speed is < 1km/h, show 0)
    if (speed < 1.0) speed = 0;

    // ================== BATTERY SIMULATION ==================
    // Drain battery based on speed. Faster speed = faster drain.
    // At 25 km/h, it will drop exactly 1% every ~3.5 minutes of continuous riding.
    if (speed > 5.0) {
      float drainRate = (speed / 25.0) * 0.0045; // 0.0045% per second
      currentBattery -= drainRate;
      if (currentBattery < 0) currentBattery = 0;

      // Save to flash memory ONLY when it drops by a full 1% (prevents wearing out flash memory)
      if ((int)currentBattery < lastSavedBattery) {
         lastSavedBattery = (int)currentBattery;
         preferences.putFloat("batt", currentBattery);
         Serial.printf("Battery dropped. Saved to memory: %d%%\n", lastSavedBattery);
      }
    }

    int battery = (int)currentBattery;  
    int range = battery * 0.25;  

    // ================== DEBUG ==================
    Serial.printf("Pulses: %lu | Speed: %.2f km/h | GPS: %.4f, %.4f\n", count, speed, currentLat, currentLng);

    // ================== UPDATE GPS DATA ==================
    if (gps.location.isValid()) {
      currentLat = gps.location.lat();
      currentLng = gps.location.lng();
    }
    if (gps.course.isValid()) {
      currentHeading = gps.course.deg();
    }

    // ================== SEND VIA BLE ==================
    if (deviceConnected) {
      char payload[150];
      snprintf(payload, sizeof(payload),
               "{\"s\":%.0f,\"b\":%d,\"r\":%d,\"lat\":%.6f,\"lng\":%.6f,\"h\":%d}",
               speed, battery, range, currentLat, currentLng, currentHeading);

      pCharacteristic->setValue((uint8_t*)payload, strlen(payload));
      pCharacteristic->notify();
    }

    lastMillis = millis();
  }

  // Handle reconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Re-advertising...");
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
