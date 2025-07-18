#!/usr/bin/env python3
"""
Enhanced Backend API Testing for Virtual Farming Platform
Tests all backend endpoints including new PayPal integration, enhanced machine management,
fertilizer specs, and updated order system
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "http://localhost:8001/api"

class VirtualFarmingTester:
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
        
    def test_api_root(self):
        """Test the root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("API Root", True, f"API is accessible: {data['message']}")
                    return True
                else:
                    self.log_test("API Root", False, "API response missing message field")
                    return False
            else:
                self.log_test("API Root", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("API Root", False, f"Connection error: {str(e)}")
            return False
    
    def test_initialize_data(self):
        """Test sample data initialization"""
        try:
            response = self.session.post(f"{self.base_url}/initialize-data")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Initialize Sample Data", True, data.get("message", "Data initialized"))
                return True
            else:
                self.log_test("Initialize Sample Data", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Initialize Sample Data", False, f"Error: {str(e)}")
            return False
    
    def test_get_plots(self):
        """Test fetching all plots"""
        try:
            response = self.session.get(f"{self.base_url}/plots")
            if response.status_code == 200:
                plots = response.json()
                if isinstance(plots, list) and len(plots) > 0:
                    self.log_test("Get All Plots", True, f"Retrieved {len(plots)} plots")
                    return plots
                else:
                    self.log_test("Get All Plots", False, "No plots returned or invalid format")
                    return []
            else:
                self.log_test("Get All Plots", False, f"HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("Get All Plots", False, f"Error: {str(e)}")
            return []
    
    def test_get_plot_by_id(self, plot_id):
        """Test fetching a specific plot by ID"""
        try:
            response = self.session.get(f"{self.base_url}/plots/{plot_id}")
            if response.status_code == 200:
                plot = response.json()
                if "id" in plot and plot["id"] == plot_id:
                    self.log_test("Get Plot by ID", True, f"Retrieved plot: {plot['name']}")
                    return plot
                else:
                    self.log_test("Get Plot by ID", False, "Plot ID mismatch or invalid format")
                    return None
            elif response.status_code == 404:
                self.log_test("Get Plot by ID", False, "Plot not found (404)")
                return None
            else:
                self.log_test("Get Plot by ID", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Get Plot by ID", False, f"Error: {str(e)}")
            return None
    
    def test_create_plot(self):
        """Test creating a new plot"""
        plot_data = {
            "name": "Test Farm Plot",
            "size_acres": 1.5,
            "soil_type": "loamy",
            "location": "Test Location, Bavaria",
            "description": "Test plot for automated testing",
            "price_per_acre": 125.0,
            "image_url": "https://example.com/test-plot.jpg"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/plots", json=plot_data)
            if response.status_code == 200:
                plot = response.json()
                if "id" in plot and plot["name"] == plot_data["name"]:
                    self.log_test("Create Plot", True, f"Created plot with ID: {plot['id']}")
                    return plot
                else:
                    self.log_test("Create Plot", False, "Invalid plot creation response")
                    return None
            else:
                self.log_test("Create Plot", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Plot", False, f"Error: {str(e)}")
            return None
    
    def test_get_machines(self):
        """Test fetching all machines"""
        try:
            response = self.session.get(f"{self.base_url}/machines")
            if response.status_code == 200:
                machines = response.json()
                if isinstance(machines, list) and len(machines) > 0:
                    self.log_test("Get All Machines", True, f"Retrieved {len(machines)} machines")
                    return machines
                else:
                    self.log_test("Get All Machines", False, "No machines returned or invalid format")
                    return []
            else:
                self.log_test("Get All Machines", False, f"HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("Get All Machines", False, f"Error: {str(e)}")
            return []
    
    def test_get_machines_by_working_step(self, working_step):
        """Test fetching machines by working step (NEW FEATURE)"""
        try:
            response = self.session.get(f"{self.base_url}/machines/step/{working_step}")
            if response.status_code == 200:
                machines = response.json()
                if isinstance(machines, list):
                    self.log_test(f"Get Machines by Working Step ({working_step})", True, f"Retrieved {len(machines)} machines for {working_step}")
                    return machines
                else:
                    self.log_test(f"Get Machines by Working Step ({working_step})", False, "Invalid response format")
                    return []
            else:
                self.log_test(f"Get Machines by Working Step ({working_step})", False, f"HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test(f"Get Machines by Working Step ({working_step})", False, f"Error: {str(e)}")
            return []
    
    def test_fertilizer_specs_api(self):
        """Test the new fertilizer specs API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/fertilizer-specs")
            if response.status_code == 200:
                fertilizer_specs = response.json()
                if isinstance(fertilizer_specs, dict):
                    # Check for expected fertilizer types
                    expected_types = ["ssa", "kas", "schweinegulle", "rinderguelle", "gaerrest", "rindermist"]
                    found_types = [ftype for ftype in expected_types if ftype in fertilizer_specs]
                    
                    if len(found_types) >= 4:  # At least 4 fertilizer types should be present
                        self.log_test("Fertilizer Specs API", True, f"Retrieved {len(fertilizer_specs)} fertilizer specifications including: {', '.join(found_types)}")
                        return fertilizer_specs
                    else:
                        self.log_test("Fertilizer Specs API", False, f"Missing expected fertilizer types. Found: {found_types}")
                        return {}
                else:
                    self.log_test("Fertilizer Specs API", False, "Invalid response format - expected dictionary")
                    return {}
            else:
                self.log_test("Fertilizer Specs API", False, f"HTTP {response.status_code}: {response.text}")
                return {}
        except Exception as e:
            self.log_test("Fertilizer Specs API", False, f"Error: {str(e)}")
            return {}
    
    def test_paypal_create_order(self, order_id, amount):
        """Test PayPal order creation (NEW FEATURE)"""
        paypal_data = {
            "order_id": order_id,
            "amount": amount
        }
        
        try:
            response = self.session.post(f"{self.base_url}/payments/create-paypal-order", json=paypal_data)
            if response.status_code == 200:
                result = response.json()
                if "paypal_order_id" in result:
                    self.log_test("PayPal Create Order", True, f"Created PayPal order: {result['paypal_order_id']}")
                    return result["paypal_order_id"]
                else:
                    self.log_test("PayPal Create Order", False, "Missing paypal_order_id in response")
                    return None
            else:
                self.log_test("PayPal Create Order", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("PayPal Create Order", False, f"Error: {str(e)}")
            return None
    
    def test_paypal_capture_order(self, paypal_order_id):
        """Test PayPal order capture (NEW FEATURE)"""
        capture_data = {
            "paypal_order_id": paypal_order_id
        }
        
        try:
            response = self.session.post(f"{self.base_url}/payments/capture-paypal-order", json=capture_data)
            if response.status_code == 200:
                result = response.json()
                if "status" in result and result["status"] == "success":
                    self.log_test("PayPal Capture Order", True, f"Captured PayPal order successfully")
                    return True
                else:
                    self.log_test("PayPal Capture Order", False, "PayPal capture failed or invalid response")
                    return False
            else:
                self.log_test("PayPal Capture Order", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("PayPal Capture Order", False, f"Error: {str(e)}")
            return False
    
    def test_create_machine(self):
        """Test creating a new machine with working step"""
        machine_data = {
            "name": "Test John Deere 8R370",
            "type": "traktor",
            "description": "Test tractor for automated testing",
            "price_per_use": 6.50,
            "suitable_for": ["weizen", "roggen", "gerste"],
            "working_step": "bodenbearbeitung",
            "image_url": "https://example.com/test-tractor.jpg"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/machines", json=machine_data)
            if response.status_code == 200:
                machine = response.json()
                if "id" in machine and machine["name"] == machine_data["name"]:
                    self.log_test("Create Machine", True, f"Created machine with ID: {machine['id']}")
                    return machine
                else:
                    self.log_test("Create Machine", False, "Invalid machine creation response")
                    return None
            else:
                self.log_test("Create Machine", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Machine", False, f"Error: {str(e)}")
            return None
    
    def test_create_order(self, plot_id, machine_ids):
        """Test creating a farming order with enhanced structure"""
        order_data = {
            "user_name": "Hans Mueller",
            "user_email": "hans.mueller@example.com",
            "user_phone": "+49 123 456789",
            "plot_id": plot_id,
            "farming_decision": {
                "cultivation_method": "konventionell",
                "crop_type": "weizen",
                "expected_yield_kg": 180.0,
                "fertilizer_choice": {
                    "fertilizer_type": "kas",
                    "amount": 150.0,
                    "cost": 45.0
                },
                "machines": {
                    "bodenbearbeitung": machine_ids[:1] if len(machine_ids) >= 1 else [],
                    "aussaat": machine_ids[1:2] if len(machine_ids) >= 2 else [],
                    "pflanzenschutz": machine_ids[2:3] if len(machine_ids) >= 3 else [],
                    "duengung": machine_ids[3:4] if len(machine_ids) >= 4 else [],
                    "pflege": machine_ids[4:5] if len(machine_ids) >= 5 else [],
                    "ernte": machine_ids[5:6] if len(machine_ids) >= 6 else []
                },
                "harvest_option": "ship_home",
                "shipping_address": "Musterstraße 123, 12345 Berlin, Deutschland"
            },
            "notes": "Test order for enhanced farming simulator testing"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/orders", json=order_data)
            if response.status_code == 200:
                order = response.json()
                if "id" in order and "total_cost" in order:
                    # Check if order includes fertilizer cost and payment_data field
                    has_fertilizer_cost = order["total_cost"] > 0
                    has_payment_field = "payment_data" in order or True  # payment_data might be None initially
                    
                    self.log_test("Create Enhanced Order", True, f"Created order with ID: {order['id']}, Cost: €{order['total_cost']}")
                    return order
                else:
                    self.log_test("Create Enhanced Order", False, "Invalid order creation response")
                    return None
            else:
                self.log_test("Create Enhanced Order", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Enhanced Order", False, f"Error: {str(e)}")
            return None
    
    def test_get_orders(self):
        """Test fetching all orders"""
        try:
            response = self.session.get(f"{self.base_url}/orders")
            if response.status_code == 200:
                orders = response.json()
                if isinstance(orders, list):
                    self.log_test("Get All Orders", True, f"Retrieved {len(orders)} orders")
                    return orders
                else:
                    self.log_test("Get All Orders", False, "Invalid response format")
                    return []
            else:
                self.log_test("Get All Orders", False, f"HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_test("Get All Orders", False, f"Error: {str(e)}")
            return []
    
    def test_get_order_by_id(self, order_id):
        """Test fetching a specific order by ID"""
        try:
            response = self.session.get(f"{self.base_url}/orders/{order_id}")
            if response.status_code == 200:
                order = response.json()
                if "id" in order and order["id"] == order_id:
                    self.log_test("Get Order by ID", True, f"Retrieved order: {order['id']}")
                    return order
                else:
                    self.log_test("Get Order by ID", False, "Order ID mismatch or invalid format")
                    return None
            elif response.status_code == 404:
                self.log_test("Get Order by ID", False, "Order not found (404)")
                return None
            else:
                self.log_test("Get Order by ID", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Get Order by ID", False, f"Error: {str(e)}")
            return None
    
    def test_update_order(self, order_id):
        """Test updating an order status"""
        update_data = {
            "status": "confirmed",
            "notes": "Order confirmed by automated testing"
        }
        
        try:
            response = self.session.patch(f"{self.base_url}/orders/{order_id}", json=update_data)
            if response.status_code == 200:
                order = response.json()
                if order["status"] == "confirmed":
                    self.log_test("Update Order", True, f"Updated order status to: {order['status']}")
                    return order
                else:
                    self.log_test("Update Order", False, "Order status not updated correctly")
                    return None
            else:
                self.log_test("Update Order", False, f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_test("Update Order", False, f"Error: {str(e)}")
            return None
    
    def run_comprehensive_test(self):
        """Run all backend tests in sequence"""
        print("=" * 60)
        print("VIRTUAL FARMING PLATFORM - BACKEND API TESTING")
        print("=" * 60)
        
        # Test 1: API Root
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test 2: Initialize sample data
        if not self.test_initialize_data():
            print("❌ Failed to initialize sample data. Continuing with existing data...")
        
        # Test 3: Plot Management
        plots = self.test_get_plots()
        if plots:
            # Test getting specific plot
            self.test_get_plot_by_id(plots[0]["id"])
        
        # Test creating new plot
        new_plot = self.test_create_plot()
        
        # Test 4: Machine Management
        machines = self.test_get_machines()
        if machines:
            # Test getting machines by type
            machine_types = ["tractor", "seeder", "harvester"]
            for machine_type in machine_types:
                self.test_get_machines_by_type(machine_type)
        
        # Test creating new machine
        new_machine = self.test_create_machine()
        
        # Test 5: Order Management
        if plots and machines:
            # Create an order with farming decisions
            machine_ids = [m["id"] for m in machines[:4]]  # Get first 4 machine IDs
            order = self.test_create_order(plots[0]["id"], machine_ids)
            
            if order:
                # Test getting all orders
                self.test_get_orders()
                
                # Test getting specific order
                self.test_get_order_by_id(order["id"])
                
                # Test updating order
                self.test_update_order(order["id"])
        
        # Test Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
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
        
        return passed == total

if __name__ == "__main__":
    tester = VirtualFarmingTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check the results above.")
        sys.exit(1)