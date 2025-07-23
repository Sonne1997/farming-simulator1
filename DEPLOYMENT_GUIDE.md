# MongoDB Atlas Setup Guide

## 1. Account erstellen:
- Gehen Sie zu: https://www.mongodb.com/atlas
- "Try Free" klicken
- Account erstellen (falls noch nicht vorhanden)

## 2. Cluster erstellen:
- "Build a Database" klicken
- "M0 Sandbox" (FREE) auswählen
- Provider: AWS
- Region: Frankfurt (eu-central-1) - nahe Deutschland
- Cluster Name: "farming-simulator-prod"

## 3. Database User erstellen:
- Username: farmingadmin
- Password: [Sicheres Passwort generieren]
- Database User Privileges: "Atlas admin"

## 4. Network Access:
- "Add IP Address" klicken  
- "Allow access from anywhere" (0.0.0.0/0)
- (Für Production später auf spezifische IPs beschränken)

## 5. Connection String erhalten:
- "Connect" klicken
- "Connect your application"
- Driver: Python
- Version: 3.12 or later
- Connection String kopieren: mongodb+srv://farmingadmin:<password>@farming-simulator-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority

WICHTIG: <password> durch echtes Passwort ersetzen!