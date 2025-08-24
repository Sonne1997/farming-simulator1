#!/usr/bin/env python3
"""
Production Issues Testing for Virtual Farming Platform
Tests specific issues reported on live website spiel.lustauflandwirtschaft.de:
1. Missing Miststreuer for organic fertilizer (should have fertilizer_type "organic_solid" for Rindermist)
2. Missing price values (showing only "€/ha" instead of "10.0€/ha")
3. Wrong harvest machine count (4 instead of 2 for Winterroggen)
4. Slow loading times for plots and machines endpoints
"""

import requests
import json
import sys
import time
from datetime import datetime

# Backend URL from frontend/.env
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

class ProductionIssuesTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message="", data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })
    
    def test_miststreuer_exists(self):
        """Test that Miststreuer machine exists with correct fertilizer_type 'organic_solid' for Rindermist"""
        try:
            # Get all fertilization machines
            response = self.session.get(f"{self.base_url}/machines/step/duengung")
            if response.status_code != 200:
                self.log_test("Miststreuer Existence", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            duengung_machines = response.json()
            
            # Look for Miststreuer machine
            miststreuer_found = False
            miststreuer_machine = None
            
            for machine in duengung_machines:
                machine_name = machine.get("name", "").lower()
                if "miststreuer" in machine_name:
                    miststreuer_found = True
                    miststreuer_machine = machine
                    break
            
            if not miststreuer_found:
                self.log_test("Miststreuer Existence", False, "Miststreuer machine not found in fertilization machines")
                return False
            
            # Check if it has correct fertilizer_type
            fertilizer_type = miststreuer_machine.get("fertilizer_type", "")
            if fertilizer_type == "organic_solid":
                self.log_test("Miststreuer Fertilizer Type", True, f"Miststreuer has correct fertilizer_type: {fertilizer_type}")
            else:
                self.log_test("Miststreuer Fertilizer Type", False, f"Miststreuer has incorrect fertilizer_type: {fertilizer_type}, expected: organic_solid")
                return False
            
            # Check if it's suitable for crops that would use Rindermist
            suitable_for = miststreuer_machine.get("suitable_for", [])
            winter_crops = ["winterweizen", "winterroggen", "wintergerste", "wintertriticale"]
            suitable_winter_crops = [crop for crop in winter_crops if crop in suitable_for]
            
            if len(suitable_winter_crops) >= 2:
                self.log_test("Miststreuer Crop Compatibility", True, f"Miststreuer suitable for winter crops: {suitable_winter_crops}")
                return True
            else:
                self.log_test("Miststreuer Crop Compatibility", False, f"Miststreuer not suitable for enough winter crops: {suitable_for}")
                return False
                
        except Exception as e:
            self.log_test("Miststreuer Existence", False, f"Error: {str(e)}")
            return False
    
    def test_machine_prices_not_null(self):
        """Test that all machines have proper price_per_use values (not null/undefined)"""
        try:
            response = self.session.get(f"{self.base_url}/machines")
            if response.status_code != 200:
                self.log_test("Machine Prices Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            machines = response.json()
            
            machines_with_null_prices = []
            machines_with_zero_prices = []
            machines_with_valid_prices = []
            
            for machine in machines:
                price_per_use = machine.get("price_per_use")
                machine_name = machine.get("name", "Unknown")
                
                if price_per_use is None:
                    machines_with_null_prices.append(machine_name)
                elif price_per_use == 0:
                    machines_with_zero_prices.append(machine_name)
                elif price_per_use > 0:
                    machines_with_valid_prices.append(f"{machine_name}: €{price_per_use}")
                else:
                    machines_with_null_prices.append(f"{machine_name} (negative price: {price_per_use})")
            
            # Report results
            if machines_with_null_prices:
                self.log_test("Machine Prices - Null Values", False, f"Machines with null/invalid prices: {machines_with_null_prices}")
                return False
            else:
                self.log_test("Machine Prices - Null Values", True, "No machines with null prices found")
            
            if machines_with_zero_prices:
                self.log_test("Machine Prices - Zero Values", False, f"Machines with zero prices: {machines_with_zero_prices}")
            else:
                self.log_test("Machine Prices - Zero Values", True, "No machines with zero prices")
            
            if len(machines_with_valid_prices) >= 15:  # Expect at least 15 machines with valid prices
                self.log_test("Machine Prices - Valid Values", True, f"Found {len(machines_with_valid_prices)} machines with valid prices")
                return True
            else:
                self.log_test("Machine Prices - Valid Values", False, f"Only {len(machines_with_valid_prices)} machines have valid prices, expected at least 15")
                return False
                
        except Exception as e:
            self.log_test("Machine Prices Check", False, f"Error: {str(e)}")
            return False
    
    def test_winterroggen_harvest_filtering(self):
        """Test that Winterroggen shows only 2 harvest machines: Mähdrescher and Ganzpflanzensilage-Häcksler"""
        try:
            response = self.session.get(f"{self.base_url}/machines/step/ernte")
            if response.status_code != 200:
                self.log_test("Winterroggen Harvest Filtering", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            harvest_machines = response.json()
            
            # Find machines suitable for Winterroggen
            winterroggen_machines = []
            for machine in harvest_machines:
                suitable_for = machine.get("suitable_for", [])
                if "winterroggen" in suitable_for:
                    winterroggen_machines.append(machine["name"])
            
            # Expected machines for Winterroggen
            expected_machines = ["Mähdrescher", "Ganzpflanzensilage"]
            
            # Check if we have exactly 2 machines
            if len(winterroggen_machines) == 2:
                self.log_test("Winterroggen Harvest Count", True, f"Winterroggen shows exactly 2 harvest machines: {winterroggen_machines}")
            else:
                self.log_test("Winterroggen Harvest Count", False, f"Winterroggen shows {len(winterroggen_machines)} machines instead of 2: {winterroggen_machines}")
                return False
            
            # Check if the correct machines are present
            has_mahdrescher = any("mähdrescher" in machine.lower() or "t660i" in machine.lower() for machine in winterroggen_machines)
            has_ganzpflanzensilage = any("ganzpflanzensilage" in machine.lower() for machine in winterroggen_machines)
            
            if has_mahdrescher and has_ganzpflanzensilage:
                self.log_test("Winterroggen Harvest Types", True, f"Winterroggen has both required harvest types: grain harvester and whole plant silage")
                return True
            else:
                missing_types = []
                if not has_mahdrescher:
                    missing_types.append("Mähdrescher (grain harvester)")
                if not has_ganzpflanzensilage:
                    missing_types.append("Ganzpflanzensilage-Häcksler")
                
                self.log_test("Winterroggen Harvest Types", False, f"Winterroggen missing harvest types: {missing_types}")
                return False
                
        except Exception as e:
            self.log_test("Winterroggen Harvest Filtering", False, f"Error: {str(e)}")
            return False
    
    def test_api_response_times(self):
        """Test API response times for plots and machines endpoints"""
        endpoints_to_test = [
            ("/plots", "Plots Endpoint"),
            ("/machines", "Machines Endpoint"),
            ("/machines/step/ernte", "Harvest Machines Endpoint"),
            ("/fertilizer-specs", "Fertilizer Specs Endpoint")
        ]
        
        response_times = {}
        slow_endpoints = []
        
        for endpoint, name in endpoints_to_test:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}")
                end_time = time.time()
                
                response_time = end_time - start_time
                response_times[name] = response_time
                
                # Consider anything over 3 seconds as slow
                if response_time > 3.0:
                    slow_endpoints.append(f"{name}: {response_time:.2f}s")
                    self.log_test(f"Response Time - {name}", False, f"Slow response: {response_time:.2f}s (>3s)")
                elif response_time > 1.0:
                    self.log_test(f"Response Time - {name}", True, f"Acceptable response: {response_time:.2f}s (>1s but <3s)")
                else:
                    self.log_test(f"Response Time - {name}", True, f"Fast response: {response_time:.2f}s (<1s)")
                
            except Exception as e:
                self.log_test(f"Response Time - {name}", False, f"Error: {str(e)}")
                slow_endpoints.append(f"{name}: ERROR")
        
        # Overall response time assessment
        if slow_endpoints:
            self.log_test("Overall API Performance", False, f"Slow endpoints detected: {slow_endpoints}")
            return False
        else:
            avg_response_time = sum(response_times.values()) / len(response_times)
            self.log_test("Overall API Performance", True, f"All endpoints responsive. Average response time: {avg_response_time:.2f}s")
            return True
    
    def test_rindermist_fertilizer_availability(self):
        """Test that Rindermist fertilizer is available in fertilizer specs"""
        try:
            response = self.session.get(f"{self.base_url}/fertilizer-specs")
            if response.status_code != 200:
                self.log_test("Rindermist Fertilizer Availability", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            fertilizer_specs = response.json()
            
            # Check if Rindermist is available
            if "rindermist" in fertilizer_specs:
                rindermist_spec = fertilizer_specs["rindermist"]
                
                # Check if it's properly categorized as organic
                if rindermist_spec.get("category") == "organic" and rindermist_spec.get("organic") == True:
                    self.log_test("Rindermist Fertilizer Category", True, f"Rindermist properly categorized as organic fertilizer")
                else:
                    self.log_test("Rindermist Fertilizer Category", False, f"Rindermist not properly categorized: {rindermist_spec}")
                    return False
                
                # Check if it has proper pricing
                price_per_m3 = rindermist_spec.get("price_per_m3", 0)
                if price_per_m3 > 0:
                    self.log_test("Rindermist Fertilizer Pricing", True, f"Rindermist has valid pricing: €{price_per_m3}/m³")
                    return True
                else:
                    self.log_test("Rindermist Fertilizer Pricing", False, f"Rindermist has invalid pricing: {price_per_m3}")
                    return False
            else:
                self.log_test("Rindermist Fertilizer Availability", False, "Rindermist not found in fertilizer specifications")
                return False
                
        except Exception as e:
            self.log_test("Rindermist Fertilizer Availability", False, f"Error: {str(e)}")
            return False
    
    def test_data_initialization_status(self):
        """Test that sample data is properly initialized"""
        try:
            # Test plots count
            response = self.session.get(f"{self.base_url}/plots")
            if response.status_code == 200:
                plots = response.json()
                if len(plots) >= 3:
                    self.log_test("Sample Data - Plots", True, f"Found {len(plots)} plots")
                else:
                    self.log_test("Sample Data - Plots", False, f"Only {len(plots)} plots found, expected at least 3")
            else:
                self.log_test("Sample Data - Plots", False, f"Failed to get plots: HTTP {response.status_code}")
            
            # Test machines count
            response = self.session.get(f"{self.base_url}/machines")
            if response.status_code == 200:
                machines = response.json()
                if len(machines) >= 15:
                    self.log_test("Sample Data - Machines", True, f"Found {len(machines)} machines")
                    return True
                else:
                    self.log_test("Sample Data - Machines", False, f"Only {len(machines)} machines found, expected at least 15")
                    return False
            else:
                self.log_test("Sample Data - Machines", False, f"Failed to get machines: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Sample Data Initialization", False, f"Error: {str(e)}")
            return False
    
    def run_production_issues_test(self):
        """Run all production issue tests"""
        print("=" * 80)
        print("PRODUCTION ISSUES TESTING - LIVE WEBSITE VERIFICATION")
        print("Testing specific issues reported on spiel.lustauflandwirtschaft.de")
        print("=" * 80)
        
        # Test API connectivity first
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code != 200:
                print(f"❌ API not accessible: HTTP {response.status_code}")
                return False
            else:
                print(f"✅ API accessible at {self.base_url}")
        except Exception as e:
            print(f"❌ API connection failed: {str(e)}")
            return False
        
        # Initialize data if needed
        print("\n🔄 Ensuring sample data is initialized...")
        try:
            response = self.session.post(f"{self.base_url}/initialize-data")
            if response.status_code == 200:
                print("✅ Sample data initialized successfully")
            else:
                print("⚠️ Sample data initialization failed, continuing with existing data...")
        except Exception as e:
            print(f"⚠️ Sample data initialization error: {str(e)}")
        
        print("\n" + "=" * 60)
        print("TESTING PRODUCTION ISSUES")
        print("=" * 60)
        
        # Test 1: Miststreuer for organic fertilizer
        print("\n1. Testing Miststreuer for organic fertilizer (Rindermist)...")
        self.test_miststreuer_exists()
        self.test_rindermist_fertilizer_availability()
        
        # Test 2: Machine price values
        print("\n2. Testing machine price values...")
        self.test_machine_prices_not_null()
        
        # Test 3: Winterroggen harvest machine filtering
        print("\n3. Testing Winterroggen harvest machine filtering...")
        self.test_winterroggen_harvest_filtering()
        
        # Test 4: API response times
        print("\n4. Testing API response times...")
        self.test_api_response_times()
        
        # Test 5: Data initialization status
        print("\n5. Testing data initialization status...")
        self.test_data_initialization_status()
        
        # Test Summary
        print("\n" + "=" * 80)
        print("PRODUCTION ISSUES TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("\n🎉 All production issue tests passed!")
        
        # Show critical production issues status
        print("\n" + "=" * 80)
        print("CRITICAL PRODUCTION ISSUES STATUS")
        print("=" * 80)
        
        critical_issues = [
            ("Miststreuer Existence", "Missing Miststreuer for organic fertilizer"),
            ("Machine Prices - Null Values", "Missing price values showing only '€/ha'"),
            ("Winterroggen Harvest Count", "Wrong harvest machine count for Winterroggen"),
            ("Overall API Performance", "Slow loading times for API endpoints")
        ]
        
        for test_name, issue_description in critical_issues:
            test_results = [r for r in self.test_results if test_name in r["test"]]
            if test_results:
                status = "✅ RESOLVED" if test_results[0]["success"] else "❌ ISSUE PERSISTS"
                print(f"{status} {issue_description}")
            else:
                print(f"⚠️  NOT TESTED {issue_description}")
        
        return passed == total

if __name__ == "__main__":
    tester = ProductionIssuesTester()
    success = tester.run_production_issues_test()
    
    if success:
        print("\n🎉 All production issues resolved! Backend is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some production issues persist. Check the results above.")
        sys.exit(1)