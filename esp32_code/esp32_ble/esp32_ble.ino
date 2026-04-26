/*
  EV Dashboard ESP32 BLE Server Firmware
  This code sets up an ESP32 as a Bluetooth Low Energy (BLE) server.
  It broadcasts the exact Service and Characteristic UUIDs that the React dashboard is looking for.
  
  Dependencies: None (uses standard built-in ESP32 BLE libraries)
  Board: DOIT ESP32 DEVKIT V1 (or any standard ESP32)
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Mock speed variable to simulate driving
uint8_t currentSpeed = 0;

// THESE UUIDS MUST MATCH THE ONES IN YOUR React App.jsx!
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Callback class to handle connection/disconnection events
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

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE work!");

  // 1. Initialize the BLE Device with a name
  BLEDevice::init("EV Bicycle");

  // 2. Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // 3. Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // 4. Create a BLE Characteristic
  // We use READ and NOTIFY properties so the browser can subscribe to data changes
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Add the BLE2902 descriptor (Required for notifications to work in Web Bluetooth)
  pCharacteristic->addDescriptor(new BLE2902());

  // 5. Start the service
  pService->start();

  // 6. Start advertising the service so the browser can find it
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  
  Serial.println("Waiting for a client connection to notify...");
}

void loop() {
    // If the browser dashboard is connected, start sending data
    if (deviceConnected) {
        
        // ---------------------------------------------------------
        // SIMULATION LOGIC: 
        // We simulate the speed, battery, and range changing over time.
        // In a real car, read these from your sensors!
        // ---------------------------------------------------------
        currentSpeed++;
        if (currentSpeed > 180) {
           currentSpeed = 0;
        }

        // Fake battery drain and range based on speed
        int simulatedBattery = 100 - (currentSpeed / 4);
        int simulatedRange = simulatedBattery * 4;

        // Create a JSON payload: e.g. {"s": 120, "b": 83, "r": 320}
        char payload[50];
        snprintf(payload, sizeof(payload), "{\"s\":%d,\"b\":%d,\"r\":%d}", currentSpeed, simulatedBattery, simulatedRange);

        // Set the characteristic value to the JSON string
        pCharacteristic->setValue((uint8_t*)payload, strlen(payload));
        
        // Notify the browser that the data has changed
        pCharacteristic->notify();
        
        // Wait 100ms before sending the next update
        delay(100); 
    }
    
    // Logic to handle disconnection cleanly
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising(); // restart advertising so you can reconnect
        Serial.println("Start advertising again");
        oldDeviceConnected = deviceConnected;
    }
    
    // Logic to handle connection cleanly
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }
}
