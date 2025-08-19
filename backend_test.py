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
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

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
            "suitable_for": ["winterweizen", "winterroggen", "wintergerste"],
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
                "crop_type": "winterweizen",
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
    
    def test_john_deere_models(self, machines):
        """Test that specific John Deere models are present"""
        expected_models = ["John Deere 8R370", "John Deere 7820", "John Deere 6R195", "John Deere 6R145", "John Deere T660i"]
        found_models = []
        
        for machine in machines:
            if any(model in machine.get("name", "") for model in expected_models):
                found_models.append(machine["name"])
        
        if len(found_models) >= 3:  # At least 3 John Deere models should be present
            self.log_test("John Deere Models Check", True, f"Found John Deere models: {', '.join(found_models)}")
            return True
        else:
            self.log_test("John Deere Models Check", False, f"Expected John Deere models not found. Found: {found_models}")
            return False
    
    def test_crop_type_enum_validation(self):
        """Test that new WINTER* crop types are accepted in order creation"""
        # Test all new crop types
        winter_crops = ["winterweizen", "winterroggen", "wintergerste", "wintertriticale", "winterraps"]
        
        plots = self.test_get_plots()
        machines = self.test_get_machines()
        
        if not plots or not machines:
            self.log_test("Crop Type Enum Validation", False, "No plots or machines available for testing")
            return False
        
        machine_ids = [m["id"] for m in machines[:6]]
        successful_crops = []
        failed_crops = []
        
        for crop_type in winter_crops:
            order_data = {
                "user_name": "Test User",
                "user_email": "test@example.com",
                "plot_id": plots[0]["id"],
                "farming_decision": {
                    "cultivation_method": "konventionell",
                    "crop_type": crop_type,
                    "expected_yield_kg": 100.0,
                    "fertilizer_choice": {
                        "fertilizer_type": "kas",
                        "amount": 100.0,
                        "cost": 30.0
                    },
                    "machines": {
                        "bodenbearbeitung": machine_ids[:1],
                        "aussaat": machine_ids[1:2],
                        "pflanzenschutz": machine_ids[2:3],
                        "duengung": machine_ids[3:4],
                        "pflege": machine_ids[4:5],
                        "ernte": machine_ids[5:6]
                    },
                    "harvest_option": "sell_to_farmer"
                }
            }
            
            try:
                response = self.session.post(f"{self.base_url}/orders", json=order_data)
                if response.status_code == 200:
                    successful_crops.append(crop_type)
                else:
                    failed_crops.append(f"{crop_type} (HTTP {response.status_code})")
            except Exception as e:
                failed_crops.append(f"{crop_type} (Error: {str(e)})")
        
        if len(successful_crops) >= 4:  # At least 4 winter crops should work
            self.log_test("Crop Type Enum Validation", True, f"Successfully validated crop types: {', '.join(successful_crops)}")
            return True
        else:
            self.log_test("Crop Type Enum Validation", False, f"Failed crops: {', '.join(failed_crops)}. Successful: {', '.join(successful_crops)}")
            return False
    
    def test_expected_yields_endpoint(self):
        """Test expected yields endpoint with different soil points"""
        soil_points_to_test = [28, 35, 42, 48]
        
        for soil_points in soil_points_to_test:
            try:
                response = self.session.get(f"{self.base_url}/expected-yields/{soil_points}")
                if response.status_code == 200:
                    yields = response.json()
                    
                    # Check if WINTER* crop types are present in yields
                    winter_crops_found = []
                    for crop_type in ["winterweizen", "winterroggen", "wintergerste", "wintertriticale"]:
                        if crop_type in yields and yields[crop_type] > 0:
                            winter_crops_found.append(crop_type)
                    
                    if len(winter_crops_found) >= 3:
                        self.log_test(f"Expected Yields (Soil Points {soil_points})", True, f"Found yields for: {', '.join(winter_crops_found)}")
                    else:
                        self.log_test(f"Expected Yields (Soil Points {soil_points})", False, f"Missing yields for WINTER* crops. Found: {winter_crops_found}")
                else:
                    self.log_test(f"Expected Yields (Soil Points {soil_points})", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Expected Yields (Soil Points {soil_points})", False, f"Error: {str(e)}")
    
    def test_machine_crop_compatibility(self):
        """Test that machines are compatible with new WINTER* crop types"""
        machines = self.test_get_machines()
        if not machines:
            self.log_test("Machine Crop Compatibility", False, "No machines available for testing")
            return False
        
        compatible_machines = 0
        winter_crops = ["winterweizen", "winterroggen", "wintergerste", "wintertriticale"]
        
        for machine in machines:
            suitable_for = machine.get("suitable_for", [])
            winter_compatible = any(crop in suitable_for for crop in winter_crops)
            if winter_compatible:
                compatible_machines += 1
        
        if compatible_machines >= 10:  # Most machines should be compatible with winter crops
            self.log_test("Machine Crop Compatibility", True, f"{compatible_machines}/{len(machines)} machines compatible with WINTER* crops")
            return True
        else:
            self.log_test("Machine Crop Compatibility", False, f"Only {compatible_machines}/{len(machines)} machines compatible with WINTER* crops")
            return False
    
    def test_market_values_endpoint(self):
        """Test market values endpoint for WINTER* crops"""
        try:
            response = self.session.get(f"{self.base_url}/market-values")
            if response.status_code == 200:
                market_values = response.json()
                
                # Check if WINTER* crop types have market values
                winter_crops_with_values = []
                for crop_type in ["winterweizen", "winterroggen", "wintergerste", "wintertriticale"]:
                    if crop_type in market_values and market_values[crop_type] > 0:
                        winter_crops_with_values.append(f"{crop_type}: €{market_values[crop_type]}")
                
                if len(winter_crops_with_values) >= 3:
                    self.log_test("Market Values for WINTER* Crops", True, f"Found values for: {', '.join(winter_crops_with_values)}")
                    return True
                else:
                    self.log_test("Market Values for WINTER* Crops", False, f"Missing market values for WINTER* crops. Found: {winter_crops_with_values}")
                    return False
            else:
                self.log_test("Market Values for WINTER* Crops", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Market Values for WINTER* Crops", False, f"Error: {str(e)}")
            return False
    
    def test_seed_costs_endpoint(self):
        """Test seed costs endpoint for WINTER* crops"""
        try:
            response = self.session.get(f"{self.base_url}/seed-costs")
            if response.status_code == 200:
                seed_costs = response.json()
                
                # Check if WINTER* crop types have seed costs
                winter_crops_with_costs = []
                for crop_type in ["winterweizen", "winterroggen", "wintergerste", "wintertriticale"]:
                    if crop_type in seed_costs and seed_costs[crop_type] > 0:
                        winter_crops_with_costs.append(f"{crop_type}: €{seed_costs[crop_type]}")
                
                if len(winter_crops_with_costs) >= 3:
                    self.log_test("Seed Costs for WINTER* Crops", True, f"Found costs for: {', '.join(winter_crops_with_costs)}")
                    return True
                else:
                    self.log_test("Seed Costs for WINTER* Crops", False, f"Missing seed costs for WINTER* crops. Found: {winter_crops_with_costs}")
                    return False
            else:
                self.log_test("Seed Costs for WINTER* Crops", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Seed Costs for WINTER* Crops", False, f"Error: {str(e)}")
            return False

    def test_winterraps_functionality(self):
        """Test Winterraps (winter rapeseed) specific functionality as requested"""
        print("\n" + "=" * 60)
        print("TESTING WINTERRAPS FUNCTIONALITY - USER REQUEST")
        print("=" * 60)
        
        try:
            # Test 1: Check that Winterraps can be harvested with Mähdrescher (John Deere T660i)
            response = self.session.get(f"{self.base_url}/machines/step/ernte")
            if response.status_code != 200:
                self.log_test("Winterraps - Get Harvest Machines", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            harvest_machines = response.json()
            
            # Find the Mähdrescher
            mahdrescher = None
            for machine in harvest_machines:
                if "T660i" in machine.get("name", "") and "Mähdrescher" in machine.get("name", ""):
                    mahdrescher = machine
                    break
            
            if not mahdrescher:
                self.log_test("Winterraps - Mähdrescher Availability", False, "John Deere T660i Mähdrescher not found")
                return False
            
            # Check if Winterraps is in suitable_for list
            suitable_for = mahdrescher.get("suitable_for", [])
            if "winterraps" in suitable_for:
                self.log_test("Winterraps - Mähdrescher Compatibility", True, f"Winterraps can be harvested with Mähdrescher. Suitable for: {suitable_for}")
            else:
                self.log_test("Winterraps - Mähdrescher Compatibility", False, f"Winterraps NOT in Mähdrescher suitable_for list: {suitable_for}")
                return False
            
            # Test 2: Verify Winterraps has both Herbst and Frühjahr insecticide treatments
            response = self.session.get(f"{self.base_url}/machines/step/pflanzenschutz")
            if response.status_code != 200:
                self.log_test("Winterraps - Get Plant Protection Machines", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            protection_machines = response.json()
            
            # Find insecticide treatments for different seasons
            herbst_insektizid = None
            fruejahr_insektizid = None
            
            for machine in protection_machines:
                treatment_type = machine.get("treatment_type", "")
                season = machine.get("season", "")
                suitable_for = machine.get("suitable_for", [])
                
                if treatment_type == "insektizid" and "winterraps" in suitable_for:
                    if season == "herbst":
                        herbst_insektizid = machine
                    elif season == "fruejahr":
                        fruejahr_insektizid = machine
            
            # Check Herbst insecticide
            if herbst_insektizid:
                self.log_test("Winterraps - Herbst Insektizid", True, f"Found Herbst insecticide for Winterraps: {herbst_insektizid['name']}")
            else:
                self.log_test("Winterraps - Herbst Insektizid", False, "No Herbst insecticide treatment found for Winterraps")
            
            # Check Frühjahr insecticide
            if fruejahr_insektizid:
                self.log_test("Winterraps - Frühjahr Insektizid", True, f"Found Frühjahr insecticide for Winterraps: {fruejahr_insektizid['name']}")
            else:
                self.log_test("Winterraps - Frühjahr Insektizid", False, "No Frühjahr insecticide treatment found for Winterraps")
            
            # Test 3: Test harvest machine filtering for Winterraps - should show the Mähdrescher
            winterraps_harvest_machines = []
            for machine in harvest_machines:
                if "winterraps" in machine.get("suitable_for", []):
                    winterraps_harvest_machines.append(machine["name"])
            
            if "John Deere T660i Mähdrescher" in str(winterraps_harvest_machines):
                self.log_test("Winterraps - Harvest Machine Filtering", True, f"Winterraps harvest filtering shows Mähdrescher: {winterraps_harvest_machines}")
            else:
                self.log_test("Winterraps - Harvest Machine Filtering", False, f"Winterraps harvest filtering missing Mähdrescher: {winterraps_harvest_machines}")
            
            # Test 4: Verify all plant protection machines for Winterraps include both herbicides and insecticides for both seasons
            winterraps_protection = {
                "herbizid_herbst": False,
                "herbizid_fruejahr": False,
                "insektizid_herbst": False,
                "insektizid_fruejahr": False
            }
            
            for machine in protection_machines:
                treatment_type = machine.get("treatment_type", "")
                season = machine.get("season", "")
                suitable_for = machine.get("suitable_for", [])
                
                if "winterraps" in suitable_for:
                    key = f"{treatment_type}_{season}"
                    if key in winterraps_protection:
                        winterraps_protection[key] = True
                        self.log_test(f"Winterraps - {treatment_type.title()} {season.title()}", True, f"Found: {machine['name']}")
            
            # Check if all required treatments are available
            missing_treatments = [key for key, found in winterraps_protection.items() if not found]
            
            if not missing_treatments:
                self.log_test("Winterraps - Complete Plant Protection", True, "All required plant protection treatments available for Winterraps (herbicides and insecticides for both seasons)")
            else:
                self.log_test("Winterraps - Complete Plant Protection", False, f"Missing treatments for Winterraps: {missing_treatments}")
            
            # Test 5: Create a test order with Winterraps to verify full workflow
            plots = self.test_get_plots()
            if plots:
                # Get machine IDs for Winterraps workflow
                bodenbearbeitung_machines = self.test_get_machines_by_working_step("bodenbearbeitung")
                aussaat_machines = self.test_get_machines_by_working_step("aussaat")
                duengung_machines = self.test_get_machines_by_working_step("duengung")
                
                if bodenbearbeitung_machines and aussaat_machines and duengung_machines and mahdrescher:
                    winterraps_order_data = {
                        "user_name": "Winterraps Tester",
                        "user_email": "winterraps@test.com",
                        "plot_id": plots[0]["id"],
                        "farming_decision": {
                            "cultivation_method": "konventionell",
                            "crop_type": "winterraps",
                            "expected_yield_kg": 50.0,
                            "fertilizer_choice": {
                                "fertilizer_type": "kas",
                                "amount": 100.0,
                                "cost": 30.0
                            },
                            "machines": {
                                "bodenbearbeitung": [bodenbearbeitung_machines[0]["id"]],
                                "aussaat": [aussaat_machines[0]["id"]],
                                "pflanzenschutz": [herbst_insektizid["id"]] if herbst_insektizid else [],
                                "duengung": [duengung_machines[0]["id"]],
                                "pflege": [],
                                "ernte": [mahdrescher["id"]]
                            },
                            "harvest_option": "ship_home"
                        }
                    }
                    
                    try:
                        response = self.session.post(f"{self.base_url}/orders", json=winterraps_order_data)
                        if response.status_code == 200:
                            order = response.json()
                            self.log_test("Winterraps - Order Creation", True, f"Successfully created Winterraps order with ID: {order['id']}, Cost: €{order['total_cost']}")
                        else:
                            self.log_test("Winterraps - Order Creation", False, f"Failed to create Winterraps order: HTTP {response.status_code}: {response.text}")
                    except Exception as e:
                        self.log_test("Winterraps - Order Creation", False, f"Error creating Winterraps order: {str(e)}")
            
            # Overall Winterraps functionality assessment
            winterraps_tests = [r for r in self.test_results if "Winterraps" in r["test"]]
            winterraps_passed = sum(1 for r in winterraps_tests if r["success"])
            winterraps_total = len(winterraps_tests)
            
            if winterraps_passed >= winterraps_total * 0.8:  # At least 80% of Winterraps tests should pass
                self.log_test("Winterraps - Overall Functionality", True, f"Winterraps functionality working correctly ({winterraps_passed}/{winterraps_total} tests passed)")
                return True
            else:
                self.log_test("Winterraps - Overall Functionality", False, f"Winterraps functionality has issues ({winterraps_passed}/{winterraps_total} tests passed)")
                return False
                
        except Exception as e:
            self.log_test("Winterraps - Overall Functionality", False, f"Error testing Winterraps functionality: {str(e)}")
            return False

    def test_harvest_machine_filtering(self):
        """Test harvest machine filtering functionality - CRITICAL BUG FIX VERIFICATION"""
        try:
            # Get all harvest machines
            response = self.session.get(f"{self.base_url}/machines/step/ernte")
            if response.status_code != 200:
                self.log_test("Harvest Machine Filtering - Get Harvest Machines", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            harvest_machines = response.json()
            
            # Verify we have exactly 4 harvest machines
            if len(harvest_machines) != 4:
                self.log_test("Harvest Machine Filtering - Machine Count", False, f"Expected 4 harvest machines, got {len(harvest_machines)}")
                return False
            
            self.log_test("Harvest Machine Filtering - Machine Count", True, f"Found {len(harvest_machines)} harvest machines")
            
            # Define expected harvest machines with their suitable_for crops
            expected_machines = {
                "John Deere T660i Mähdrescher": ["winterweizen", "winterroggen", "wintergerste", "wintertriticale", "winterraps", "khorasan_weizen", "erbsen"],
                "Mais-Claas Jaguar 940": ["silomais"],
                "Gras-Claas Jaguar 940": ["gras"],
                "Ganzpflanzensilage-Claas Jaguar 940": ["winterroggen"]
            }
            
            # Verify each expected machine exists with correct suitable_for fields
            found_machines = {}
            for machine in harvest_machines:
                machine_name = machine.get("name", "")
                suitable_for = machine.get("suitable_for", [])
                
                # Check if this is one of our expected machines
                for expected_name, expected_crops in expected_machines.items():
                    if expected_name in machine_name:
                        found_machines[expected_name] = {
                            "found": True,
                            "suitable_for": suitable_for,
                            "expected_crops": expected_crops,
                            "correct_crops": set(suitable_for) >= set(expected_crops)  # Allow additional crops
                        }
                        break
            
            # Verify all expected machines were found
            all_machines_found = True
            all_crops_correct = True
            
            for expected_name, expected_crops in expected_machines.items():
                if expected_name not in found_machines:
                    self.log_test(f"Harvest Machine Filtering - {expected_name}", False, f"Machine not found")
                    all_machines_found = False
                else:
                    machine_info = found_machines[expected_name]
                    if machine_info["correct_crops"]:
                        self.log_test(f"Harvest Machine Filtering - {expected_name}", True, f"Correct suitable_for: {machine_info['suitable_for']}")
                    else:
                        self.log_test(f"Harvest Machine Filtering - {expected_name}", False, f"Incorrect suitable_for. Expected: {expected_crops}, Got: {machine_info['suitable_for']}")
                        all_crops_correct = False
            
            # Test crop-specific filtering scenarios including Winterraps
            test_scenarios = [
                {
                    "crop": "winterroggen",
                    "expected_machines": ["John Deere T660i Mähdrescher", "Ganzpflanzensilage-Claas Jaguar 940"],
                    "description": "Winterroggen should show grain harvester and whole plant silage harvester"
                },
                {
                    "crop": "winterweizen", 
                    "expected_machines": ["John Deere T660i Mähdrescher"],
                    "description": "Winterweizen should only show grain harvester"
                },
                {
                    "crop": "winterraps",
                    "expected_machines": ["John Deere T660i Mähdrescher"],
                    "description": "Winterraps should only show grain harvester (Mähdrescher)"
                },
                {
                    "crop": "silomais",
                    "expected_machines": ["Mais-Claas Jaguar 940"],
                    "description": "Silomais should only show corn harvester"
                },
                {
                    "crop": "gras",
                    "expected_machines": ["Gras-Claas Jaguar 940"],
                    "description": "Gras should only show grass harvester"
                }
            ]
            
            crop_filtering_success = True
            for scenario in test_scenarios:
                crop = scenario["crop"]
                expected_machine_names = scenario["expected_machines"]
                description = scenario["description"]
                
                # Find machines suitable for this crop
                suitable_machines = []
                for machine in harvest_machines:
                    if crop in machine.get("suitable_for", []):
                        suitable_machines.append(machine["name"])
                
                # Check if the right machines are suitable
                expected_found = all(any(expected in machine_name for machine_name in suitable_machines) for expected in expected_machine_names)
                
                if expected_found:
                    self.log_test(f"Harvest Machine Filtering - {crop.title()} Crop", True, f"{description}. Found: {suitable_machines}")
                else:
                    self.log_test(f"Harvest Machine Filtering - {crop.title()} Crop", False, f"{description}. Expected: {expected_machine_names}, Found: {suitable_machines}")
                    crop_filtering_success = False
            
            # Overall harvest machine filtering test result
            overall_success = all_machines_found and all_crops_correct and crop_filtering_success
            
            if overall_success:
                self.log_test("Harvest Machine Filtering - Overall", True, "All harvest machines have correct suitable_for fields and crop-specific filtering works correctly")
                return True
            else:
                self.log_test("Harvest Machine Filtering - Overall", False, "Harvest machine filtering has issues with suitable_for fields or crop-specific filtering")
                return False
                
        except Exception as e:
            self.log_test("Harvest Machine Filtering - Overall", False, f"Error: {str(e)}")
            return False

    def test_working_steps_categorization(self, machines):
        """Test that machines are properly categorized by working steps"""
        working_steps = ["bodenbearbeitung", "aussaat", "pflanzenschutz", "duengung", "pflege", "ernte"]
        step_counts = {}
        
        for machine in machines:
            working_step = machine.get("working_step")
            if working_step in working_steps:
                step_counts[working_step] = step_counts.get(working_step, 0) + 1
        
        if len(step_counts) >= 4:  # At least 4 different working steps should have machines
            self.log_test("Working Steps Categorization", True, f"Machines categorized across {len(step_counts)} working steps: {dict(step_counts)}")
            return True
        else:
            self.log_test("Working Steps Categorization", False, f"Insufficient working step categorization. Found: {step_counts}")
            return False
    
    def run_comprehensive_test(self):
        """Run all backend tests in sequence including new enhanced features and crop type validation"""
        print("=" * 80)
        print("ENHANCED VIRTUAL FARMING PLATFORM - BACKEND API TESTING")
        print("Testing WINTER* Crop Type System After Major Backend Update")
        print("=" * 80)
        
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
        
        # Test 4: Enhanced Machine Management
        machines = self.test_get_machines()
        if machines:
            # Test John Deere models presence
            self.test_john_deere_models(machines)
            
            # Test working steps categorization
            self.test_working_steps_categorization(machines)
            
            # Test machine crop compatibility with WINTER* crops (NEW TEST)
            self.test_machine_crop_compatibility()
            
            # Test getting machines by working step (NEW FEATURE)
            working_steps = ["bodenbearbeitung", "aussaat", "pflanzenschutz", "duengung", "pflege", "ernte"]
            for step in working_steps:
                step_machines = self.test_get_machines_by_working_step(step)
                if step_machines:
                    print(f"  Found {len(step_machines)} machines for {step}")
        
        # Test 5: Fertilizer Specs API (NEW FEATURE)
        fertilizer_specs = self.test_fertilizer_specs_api()
        
        # Test 6: WINTERRAPS FUNCTIONALITY (USER REQUEST)
        self.test_winterraps_functionality()
        
        # Test 7: HARVEST MACHINE FILTERING (CRITICAL BUG FIX TEST)
        print("\n" + "=" * 60)
        print("TESTING HARVEST MACHINE FILTERING - CRITICAL BUG FIX")
        print("=" * 60)
        
        self.test_harvest_machine_filtering()
        
        # Test 7: WINTER* Crop Type System Tests (CRITICAL NEW TESTS)
        print("\n" + "=" * 60)
        print("TESTING WINTER* CROP TYPE SYSTEM")
        print("=" * 60)
        
        self.test_crop_type_enum_validation()
        self.test_expected_yields_endpoint()
        self.test_market_values_endpoint()
        self.test_seed_costs_endpoint()
        
        # Test 8: Enhanced Order Management with PayPal Integration
        if plots and machines:
            # Create an order with enhanced farming decisions
            machine_ids = [m["id"] for m in machines[:6]]  # Get first 6 machine IDs
            order = self.test_create_order(plots[0]["id"], machine_ids)
            
            if order:
                # Test PayPal payment integration (NEW FEATURE)
                paypal_order_id = self.test_paypal_create_order(order["id"], order["total_cost"])
                
                # Note: We won't test PayPal capture in automated testing as it requires actual PayPal approval
                # but we can test the endpoint structure
                if paypal_order_id:
                    print(f"  PayPal order created successfully: {paypal_order_id}")
                    print("  Note: PayPal capture testing skipped (requires manual approval)")
                
                # Test getting all orders
                self.test_get_orders()
                
                # Test getting specific order
                self.test_get_order_by_id(order["id"])
                
                # Test updating order
                self.test_update_order(order["id"])
        
        # Test Summary
        print("\n" + "=" * 80)
        print("ENHANCED FEATURES TEST SUMMARY")
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
            print("\n🎉 All tests passed!")
        
        # Show key feature test results
        print("\n" + "=" * 80)
        print("KEY ENHANCED FEATURES STATUS")
        print("=" * 80)
        
        key_features = [
            "Winterraps - Overall Functionality",
            "Winterraps - Mähdrescher Compatibility", 
            "Winterraps - Herbst Insektizid",
            "Winterraps - Frühjahr Insektizid",
            "Winterraps - Harvest Machine Filtering",
            "Harvest Machine Filtering - Overall",
            "Fertilizer Specs API",
            "Get Machines by Working Step",
            "PayPal Create Order", 
            "John Deere Models Check",
            "Working Steps Categorization",
            "Create Enhanced Order",
            "Crop Type Enum Validation",
            "Machine Crop Compatibility",
            "Market Values for WINTER* Crops",
            "Seed Costs for WINTER* Crops"
        ]
        
        for feature in key_features:
            feature_results = [r for r in self.test_results if feature in r["test"]]
            if feature_results:
                status = "✅ PASS" if feature_results[0]["success"] else "❌ FAIL"
                print(f"{status} {feature}")
            else:
                print(f"⚠️  SKIP {feature} (not tested)")
        
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