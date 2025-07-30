from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum
from paypalcheckoutsdk.core import SandboxEnvironment, LiveEnvironment, PayPalHttpClient
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersCaptureRequest
from paypalhttp import HttpError
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# PayPal configuration
paypal_client_id = os.environ.get('PAYPAL_CLIENT_ID')
paypal_client_secret = os.environ.get('PAYPAL_CLIENT_SECRET')
paypal_environment = os.environ.get('PAYPAL_ENVIRONMENT', 'sandbox')

# Initialize PayPal environment and client
if paypal_environment == 'sandbox':
    paypal_env = SandboxEnvironment(client_id=paypal_client_id, client_secret=paypal_client_secret)
else:
    paypal_env = LiveEnvironment(client_id=paypal_client_id, client_secret=paypal_client_secret)

paypal_client = PayPalHttpClient(paypal_env)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums for farming choices
class SoilType(str, Enum):
    SAND = "sand"
    LOAMY_SAND = "loamy_sand"
    CLAYEY_SAND = "clayey_sand"
    SANDY_LOAM = "sandy_loam"

class CropType(str, Enum):
    WINTERROGGEN = "winterroggen"
    WINTERWEIZEN = "winterweizen"
    WINTERGERSTE = "wintergerste"
    WINTERTRITICALE = "wintertriticale"
    WINTERRAPS = "winterraps"
    KHORASAN_WEIZEN = "khorasan_weizen"  # Sommerweizen, wenig Ertrag, teuer, viel Protein
    SILOMAIS = "silomais"
    ZUCKERRUEBEN = "zuckerrueben"
    LUZERNE = "luzerne"
    GRAS = "gras"
    BLUEHMISCHUNG = "bluehmischung"
    ERBSEN = "erbsen"

class FertilizerType(str, Enum):
    SSA = "ssa"  # Schwefelsaurer Ammoniak
    KAS = "kas"  # Kalkammonsalpeter
    SCHWEINEGULLE = "schweinegulle"
    RINDERGUELLE = "rinderguelle"
    GAERREST = "gaerrest"
    RINDERMIST = "rindermist"
    KEINE_DUENGUNG = "keine_duengung"

class CultivationMethod(str, Enum):
    KONVENTIONELL = "konventionell"
    BIOLOGISCH = "biologisch"

class MachineType(str, Enum):
    TRAKTOR = "traktor"
    TRAKTOR_AUSSAAT = "traktor_aussaat"
    TRAKTOR_DUENGUNG = "traktor_duengung"
    TRAKTOR_PFLANZENSCHUTZ = "traktor_pflanzenschutz"
    PFLUG = "pflug"
    GRUBBER = "grubber"
    SCHEIBENEGGE = "scheibenegge"
    SAEMASCHINE = "saemaschine"
    MAEHDRESCHER = "maehdrescher"
    FELDSPRITZE = "feldspritze"
    GUELLEFASS = "guellefass"
    MISTSTREUER = "miststreuer"
    HACKE = "hacke"
    STRIEGEL = "striegel"
    CAMBRIDGE_WALZE = "cambridge_walze"
    MAIS_HAECKSLER = "mais_haecksler"
    GRAS_HAECKSLER = "gras_haecksler"

class WorkingStep(str, Enum):
    BODENBEARBEITUNG = "bodenbearbeitung"
    AUSSAAT = "aussaat"
    PFLANZENSCHUTZ = "pflanzenschutz"
    DUENGUNG = "duengung"
    PFLEGE = "pflege"
    ERNTE = "ernte"

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IMPLEMENTING = "implementing"
    GROWING = "growing"
    HARVEST_READY = "harvest_ready"
    COMPLETED = "completed"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class HarvestOption(str, Enum):
    SHIP_HOME = "ship_home"
    SELL_TO_FARMER = "sell_to_farmer"

# Machine data organized by working steps
# Machine data has been moved to initialize_sample_data function
MACHINE_DATA = {}

# Market prices per ton (in EUR) - updated with real prices
MARKET_PRICES = {
    CropType.WINTERWEIZEN: 220.0,  # 0.22€/kg = 220€/t
    CropType.WINTERROGGEN: 180.0,  # 0.18€/kg = 180€/t
    CropType.WINTERGERSTE: 190.0,  # 0.19€/kg = 190€/t
    CropType.WINTERTRITICALE: 170.0,  # 0.17€/kg = 170€/t
    CropType.WINTERRAPS: 450.0,  # 0.45€/kg = 450€/t
    CropType.SILOMAIS: 35.0,  # 0.035€/kg = 35€/t
    CropType.ZUCKERRUEBEN: 45.0,  # 0.045€/kg = 45€/t
    CropType.LUZERNE: 150.0,  # 0.15€/kg = 150€/t
    CropType.GRAS: 120.0,  # 0.12€/kg = 120€/t
    CropType.BLUEHMISCHUNG: 0,  # Subsidized, no market price
    CropType.ERBSEN: 250.0  # 0.25€/kg = 250€/t
}

# Real yields per 250m² based on Grabow location (in kg)
REAL_YIELDS_250M2 = {
    CropType.WINTERWEIZEN: 125.0,      # 5 t/ha × 0.025 = 125 kg
    CropType.WINTERROGGEN: 75.0,       # 3 t/ha × 0.025 = 75 kg
    CropType.WINTERGERSTE: 100.0,      # 4 t/ha × 0.025 = 100 kg
    CropType.WINTERTRITICALE: 100.0,   # 4 t/ha × 0.025 = 100 kg
    CropType.SILOMAIS: 1200.0,   # Keeping existing estimate
    CropType.ZUCKERRUEBEN: 1500.0, # 60 t/ha × 0.025 = 1500 kg
    CropType.LUZERNE: 150.0,     # 6 t/ha × 0.025 = 150 kg
    CropType.GRAS: 200.0,        # 8 t/ha × 0.025 = 200 kg
    CropType.BLUEHMISCHUNG: 0.0, # No harvest - only subsidy
    CropType.ERBSEN: 50.0        # 2 t/ha × 0.025 = 50 kg
}

# Market values per 250m² plot (in EUR)
MARKET_VALUES_250M2 = {
    CropType.WINTERWEIZEN: 21.25,      # 125 kg × 170€/t = 21.25€
    CropType.WINTERROGGEN: 11.63,      # 75 kg × 155€/t = 11.63€
    CropType.WINTERGERSTE: 15.00,      # 100 kg × 150€/t = 15.00€
    CropType.WINTERTRITICALE: 16.50,   # 100 kg × 165€/t = 16.50€
    CropType.WINTERRAPS: 22.50,        # 50 kg × 450€/t = 22.50€
    CropType.SILOMAIS: 54.00,    # 1200 kg × 45€/t = 54.00€
    CropType.ZUCKERRUEBEN: 60.00, # 1500 kg × 40€/t = 60.00€
    CropType.LUZERNE: 27.00,     # 150 kg × 180€/t = 27.00€
    CropType.GRAS: 24.00,        # 200 kg × 120€/t = 24.00€
    CropType.BLUEHMISCHUNG: 17.50, # 700€/ha × 0.025 = 17.50€
    CropType.ERBSEN: 12.50       # 50 kg × 250€/t = 12.50€
}

# Expected yield per 250m² (in kg) - varies by soil points
# Base yields at 35 soil points, adjusted by soil quality
def calculate_yield_by_soil_points(crop_type: CropType, soil_points: int):
    """Calculate expected yield based on soil points (25-56 range)"""
    base_yields = {
        CropType.WINTERWEIZEN: 125.0,      # 5 t/ha × 0.025 = 125 kg at 35 soil points
        CropType.WINTERROGGEN: 75.0,       # 3 t/ha × 0.025 = 75 kg at 35 soil points
        CropType.WINTERGERSTE: 100.0,      # 4 t/ha × 0.025 = 100 kg at 35 soil points
        CropType.WINTERTRITICALE: 100.0,   # 4 t/ha × 0.025 = 100 kg at 35 soil points
        CropType.WINTERRAPS: 50.0,   # 2 t/ha × 0.025 = 50 kg at 35 soil points  
        CropType.SILOMAIS: 1200.0,   # 48 t/ha × 0.025 = 1200 kg at 35 soil points
        CropType.ZUCKERRUEBEN: 1500.0, # 60 t/ha × 0.025 = 1500 kg at 35 soil points
        CropType.LUZERNE: 150.0,     # 6 t/ha × 0.025 = 150 kg at 35 soil points
        CropType.GRAS: 200.0,        # 8 t/ha × 0.025 = 200 kg at 35 soil points
        CropType.BLUEHMISCHUNG: 0.0, # No harvest
        CropType.ERBSEN: 57.5        # 2.3 t/ha × 0.025 = 57.5 kg at 35 soil points (15% erhöht)
    }
    
    base_yield = base_yields.get(crop_type, 0)
    if base_yield == 0:
        return 0
    
    # Soil quality factor: 25 points = 0.8x, 35 points = 1.0x, 45 points = 1.2x, 56 points = 1.5x
    # Extended range for premium soils
    if soil_points <= 45:
        soil_factor = 0.8 + (soil_points - 25) * 0.02  # Linear scale from 0.8 to 1.2
    else:
        # Premium soils: 45-56 points = 1.2x to 1.5x
        soil_factor = 1.2 + (soil_points - 45) * 0.027  # Linear scale from 1.2 to 1.5
    
    return round(base_yield * soil_factor, 1)

EXPECTED_YIELDS = {
    CropType.WINTERWEIZEN: 125.0,
    CropType.WINTERROGGEN: 75.0,
    CropType.WINTERGERSTE: 100.0,
    CropType.WINTERTRITICALE: 100.0,
    CropType.WINTERRAPS: 50.0,   # 2 t/ha × 0.025 = 50 kg per 250m²
    CropType.KHORASAN_WEIZEN: 37.5,  # 1.5 t/ha × 0.025 = 37.5 kg per 250m² (wenig Ertrag)
    CropType.SILOMAIS: 1200.0,
    CropType.ZUCKERRUEBEN: 1500.0,
    CropType.LUZERNE: 150.0,
    CropType.GRAS: 200.0,
    CropType.BLUEHMISCHUNG: 0.0,  # No harvest
    CropType.ERBSEN: 57.5         # Erhöht um 15%: 50 * 1.15 = 57.5
}

# Seed costs per 250m² (in EUR)
SEED_COSTS = {
    CropType.WINTERWEIZEN: 2.10,  # 150kg/ha * 0.025ha * 0.56€/kg = 2.10€
    CropType.WINTERROGGEN: 1.75,
    CropType.WINTERGERSTE: 1.90,
    CropType.WINTERTRITICALE: 1.85,
    CropType.SILOMAIS: 12.50,
    CropType.ZUCKERRUEBEN: 35.00,
    CropType.LUZERNE: 8.75,
    CropType.GRAS: 3.25,
    CropType.BLUEHMISCHUNG: 15.00,
    CropType.ERBSEN: 6.25
}

# Fertilizer specifications (updated with realistic mineral fertilizer calculations)
FERTILIZER_SPECS = {
    # Mineralische Düngung
    FertilizerType.SSA: {
        "name": "Schwefelsaurer Ammoniak (SSA)",
        "n_content": 21,  # kg N in 100 kg SSA
        "s_content": 24,  # % Schwefel
        "price_per_ton": 350.0,  # EUR/t
        "organic": False,
        "category": "mineral"
    },
    FertilizerType.KAS: {
        "name": "Kalkammonsalpeter (KAS)",
        "n_content": 27,  # kg N in 100 kg KAS
        "s_content": 0,
        "price_per_ton": 300.0,  # EUR/t
        "organic": False,
        "category": "mineral"
    },
    # Organische Düngung
    FertilizerType.SCHWEINEGULLE: {
        "name": "Schweinegülle",
        "n_content": 0.4,  # % Stickstoff (4 kg N/m³)
        "s_content": 0,
        "price_per_m3": 8.50,  # EUR/m³
        "organic": True,
        "category": "organic"
    },
    FertilizerType.RINDERGUELLE: {
        "name": "Rindergülle",
        "n_content": 0.35,  # % Stickstoff (3.5 kg N/m³)
        "s_content": 0,
        "price_per_m3": 7.80,  # EUR/m³
        "organic": True,
        "category": "organic"
    },
    FertilizerType.GAERREST: {
        "name": "Gärrest (Biogasanlage)",
        "n_content": 0.45,  # % Stickstoff (4.5 kg N/m³)
        "s_content": 0,
        "price_per_m3": 9.20,  # EUR/m³
        "organic": True,
        "category": "organic"
    },
    FertilizerType.RINDERMIST: {
        "name": "Rindermist",
        "n_content": 0.5,  # % Stickstoff (5 kg N/t)
        "s_content": 0,
        "price_per_m3": 15.00,  # EUR/m³ (umgerechnet von Tonnen)
        "organic": True,
        "category": "organic"
    },
    FertilizerType.KEINE_DUENGUNG: {
        "name": "Ohne Düngung",
        "n_content": 0,
        "s_content": 0,
        "price_per_unit": 0.00,  # EUR
        "organic": False,
        "category": "none"
    }
}

# Plant protection costs (35€/ha = 0.875€ per 250m²)
PLANT_PROTECTION_COST_PER_250M2 = 0.88  # EUR per treatment

# Nitrogen requirements per crop (kg N per ton of expected yield)
N_REQUIREMENTS = {
    CropType.WINTERWEIZEN: 23.0,  # kg N/t Ertrag
    CropType.WINTERROGGEN: 20.0,
    CropType.WINTERGERSTE: 18.0,
    CropType.WINTERTRITICALE: 21.0,
    CropType.SILOMAIS: 2.8,   # kg N/t Frischmasse
    CropType.ZUCKERRUEBEN: 1.8,
    CropType.LUZERNE: 0.0,    # Leguminose - bindet selbst Stickstoff
    CropType.GRAS: 15.0,
    CropType.BLUEHMISCHUNG: 8.0,
    CropType.ERBSEN: 0.0      # Leguminose - bindet selbst Stickstoff
}

# Data Models
class Plot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    size_m2: float = 250.0  # All plots are 250m²
    length_m: float = 18.0
    width_m: float = 13.8
    soil_type: SoilType
    soil_points: int = Field(ge=25, le=56)  # Soil quality points 25-56
    location: str
    description: str
    price_per_plot: float
    available: bool = True
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlotCreate(BaseModel):
    name: str
    soil_type: SoilType
    soil_points: int = Field(ge=25, le=56)
    location: str
    description: str
    price_per_plot: float
    image_url: Optional[str] = None

class Machine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: MachineType
    description: str
    price_per_use: float
    suitable_for: List[CropType]
    working_step: WorkingStep
    image_url: Optional[str] = None

class MachineCreate(BaseModel):
    name: str
    type: MachineType
    description: str
    price_per_use: float
    suitable_for: List[CropType]
    working_step: WorkingStep
    image_url: Optional[str] = None

class FertilizerChoice(BaseModel):
    fertilizer_type: FertilizerType
    amount: float  # kg für mineral., m³ für organisch
    cost: float

class WorkingStepMachines(BaseModel):
    bodenbearbeitung: List[str] = []
    aussaat: List[str] = []
    pflanzenschutz: List[str] = []
    duengung: List[str] = []
    pflege: List[str] = []
    ernte: List[str] = []

class FarmingDecision(BaseModel):
    cultivation_method: CultivationMethod
    crop_type: CropType
    expected_yield_kg: float
    fertilizer_choice: FertilizerChoice
    machines: WorkingStepMachines
    harvest_option: HarvestOption
    shipping_address: Optional[str] = None
    special_harvest: Optional[str] = None  # "gps" for Roggen Ganzpflanzensilage

class PaymentData(BaseModel):
    paypal_order_id: str
    amount: float
    currency: str = "EUR"
    status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Advisory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    message: str
    advisory_type: str  # "disease", "pest", "fungicide", "insecticide", "general"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False

class AdvisoryCreate(BaseModel):
    order_id: str
    message: str
    advisory_type: str

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    plot_id: str
    farming_decision: FarmingDecision
    total_cost: float
    expected_yield_kg: float
    expected_market_value: float
    payment_data: Optional[PaymentData] = None
    status: OrderStatus = OrderStatus.PENDING
    notes: Optional[str] = None
    advisories: List[Advisory] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    plot_id: str
    farming_decision: FarmingDecision
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: OrderStatus
    notes: Optional[str] = None

class PayPalOrderCreate(BaseModel):
    order_id: str
    amount: float

class PayPalOrderCapture(BaseModel):
    paypal_order_id: str

# Routes
@api_router.get("/")
async def root():
    return {"message": "Lust auf Landwirtschaft API"}

# Plot management
@api_router.get("/plots", response_model=List[Plot])
async def get_plots():
    plots = await db.plots.find({"available": True}).to_list(1000)
    return [Plot(**plot) for plot in plots]

@api_router.get("/plots/{plot_id}", response_model=Plot)
async def get_plot(plot_id: str):
    plot = await db.plots.find_one({"id": plot_id})
    if not plot:
        raise HTTPException(status_code=404, detail="Parzelle nicht gefunden")
    return Plot(**plot)

@api_router.post("/plots", response_model=Plot)
async def create_plot(plot_data: PlotCreate):
    plot = Plot(**plot_data.dict())
    await db.plots.insert_one(plot.dict())
    return plot

# Machine management
@api_router.get("/machines", response_model=List[Machine])
async def get_machines():
    machines = await db.machines.find().to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.get("/machines/{machine_type}")
async def get_machines_by_type(machine_type: MachineType):
    machines = await db.machines.find({"type": machine_type}).to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.get("/machines/step/{working_step}")
async def get_machines_by_working_step(working_step: WorkingStep):
    machines = await db.machines.find({"working_step": working_step}).to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.post("/machines", response_model=Machine)
async def create_machine(machine_data: MachineCreate):
    machine = Machine(**machine_data.dict())
    await db.machines.insert_one(machine.dict())
    return machine

# Get expected yields based on soil points
@api_router.get("/expected-yields/{soil_points}")
async def get_expected_yields_by_soil(soil_points: int):
    if soil_points < 25 or soil_points > 56:
        raise HTTPException(status_code=400, detail="Bodenpunkte müssen zwischen 25 und 56 liegen")
    
    # Calculate yields based on soil points
    yields = {}
    for crop_type in CropType:
        yields[crop_type] = calculate_yield_by_soil_points(crop_type, soil_points)
    
    return yields

@api_router.get("/market-values")
async def get_market_values():
    return MARKET_VALUES_250M2

@api_router.get("/seed-costs")
async def get_seed_costs():
    return SEED_COSTS

@api_router.get("/fertilizer-specs")
async def get_fertilizer_specs():
    return FERTILIZER_SPECS

@api_router.get("/nitrogen-requirements")
async def get_nitrogen_requirements():
    return N_REQUIREMENTS

# PayPal payment endpoints
@api_router.post("/payments/create-paypal-order")
async def create_paypal_order(order_data: PayPalOrderCreate):
    try:
        request = OrdersCreateRequest()
        request.prefer('return=representation')
        request.request_body({
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": order_data.order_id,
                "amount": {
                    "currency_code": "EUR",
                    "value": f"{order_data.amount:.2f}"
                }
            }]
        })
        
        response = paypal_client.execute(request)
        
        # Update order with payment data
        await db.orders.update_one(
            {"id": order_data.order_id},
            {
                "$set": {
                    "payment_data": {
                        "paypal_order_id": response.result.id,
                        "amount": order_data.amount,
                        "currency": "EUR",
                        "status": PaymentStatus.PENDING,
                        "created_at": datetime.utcnow()
                    }
                }
            }
        )
        
        return {"paypal_order_id": response.result.id}
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"PayPal error: {e}")

@api_router.post("/payments/capture-paypal-order")
async def capture_paypal_order(capture_data: PayPalOrderCapture):
    try:
        request = OrdersCaptureRequest(capture_data.paypal_order_id)
        response = paypal_client.execute(request)
        
        # Find order by PayPal order ID
        order = await db.orders.find_one({"payment_data.paypal_order_id": capture_data.paypal_order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update payment status
        await db.orders.update_one(
            {"id": order["id"]},
            {
                "$set": {
                    "payment_data.status": PaymentStatus.COMPLETED,
                    "status": OrderStatus.CONFIRMED,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"status": "success", "capture_id": response.result.id}
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"PayPal error: {e}")

# Calculate nitrogen requirement for specific crop and yield
@api_router.get("/calculate-nitrogen-need/{crop_type}/{expected_yield_kg}")
async def calculate_nitrogen_need(crop_type: CropType, expected_yield_kg: float):
    if crop_type not in N_REQUIREMENTS:
        raise HTTPException(status_code=404, detail="Kultur nicht gefunden")
    
    # Convert kg to tons for calculation
    expected_yield_tons = expected_yield_kg / 1000
    
    # Calculate nitrogen requirement
    n_req_per_ton = N_REQUIREMENTS[crop_type]
    total_n_requirement = expected_yield_tons * n_req_per_ton
    
    return {
        "crop_type": crop_type,
        "expected_yield_kg": expected_yield_kg,
        "expected_yield_tons": expected_yield_tons,
        "n_requirement_per_ton": n_req_per_ton,
        "total_n_requirement_kg": total_n_requirement,
        "fertilizer_options": calculate_fertilizer_options(total_n_requirement)
    }

def calculate_fertilizer_options(n_requirement_kg: float):
    """Calculate fertilizer amounts and costs for different fertilizer types"""
    options = []
    
    for fert_type, specs in FERTILIZER_SPECS.items():
        if specs["category"] == "organic":
            # Organic fertilizers (m³ or t)
            if fert_type == FertilizerType.RINDERMIST:
                # Rindermist: price per ton, N content as % (5 kg N/t)
                n_content_per_ton = specs["n_content"] * 10  # Convert % to kg/t
                required_amount = n_requirement_kg / n_content_per_ton if n_content_per_ton > 0 else 0
                cost = required_amount * specs["price_per_ton"]
                unit = "t"
            else:
                # Other organic fertilizers: price per m³
                n_content_per_m3 = specs["n_content"] * 10  # Convert % to kg/m³
                required_amount = n_requirement_kg / n_content_per_m3 if n_content_per_m3 > 0 else 0
                cost = required_amount * specs["price_per_m3"]
                unit = "m³"
            
            options.append({
                "fertilizer_type": fert_type,
                "name": specs["name"],
                "required_amount": round(required_amount, 2),
                "unit": unit,
                "cost": round(cost, 2),
                "organic": True
            })
        elif specs["category"] == "mineral":
            # Mineral fertilizers (kg) - corrected calculation for 250m²
            n_content_percent = specs["n_content"] / 100  # Convert to decimal (21% = 0.21)
            required_amount = n_requirement_kg / n_content_percent if n_content_percent > 0 else 0
            cost = (required_amount / 1000) * specs["price_per_ton"]  # Convert kg to tons for cost
            
            options.append({
                "fertilizer_type": fert_type,
                "name": specs["name"],
                "required_amount": round(required_amount, 2),
                "unit": "kg",
                "cost": round(cost, 2),
                "organic": False
            })
        else:
            # No fertilizer option
            options.append({
                "fertilizer_type": fert_type,
                "name": specs["name"],
                "required_amount": 0,
                "unit": "",
                "cost": 0,
                "organic": False
            })
    
    return options

# Order management
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    # Calculate total cost
    plot = await db.plots.find_one({"id": order_data.plot_id})
    if not plot:
        raise HTTPException(status_code=404, detail="Parzelle nicht gefunden")
    
    plot_cost = plot["price_per_plot"]
    
    # Get machine costs
    all_machine_ids = (
        order_data.farming_decision.machines.bodenbearbeitung +
        order_data.farming_decision.machines.aussaat +
        order_data.farming_decision.machines.pflanzenschutz +
        order_data.farming_decision.machines.duengung +
        order_data.farming_decision.machines.pflege +
        order_data.farming_decision.machines.ernte
    )
    
    machine_cost = 0
    for machine_id in all_machine_ids:
        machine = await db.machines.find_one({"id": machine_id})
        if machine:
            machine_cost += machine["price_per_use"]
    
    # Calculate expected yield and market value based on soil points
    plot = await db.plots.find_one({"id": order_data.plot_id})
    if not plot:
        raise HTTPException(status_code=404, detail="Parzelle nicht gefunden")
    
    crop_type = order_data.farming_decision.crop_type
    soil_points = plot["soil_points"]
    expected_yield = calculate_yield_by_soil_points(crop_type, soil_points)
    market_price_per_ton = MARKET_PRICES.get(crop_type, 0)
    expected_market_value = (expected_yield / 1000) * market_price_per_ton  # Convert kg to tons
    
    # Add fertilizer cost
    fertilizer_cost = order_data.farming_decision.fertilizer_choice.cost
    
    # Add shipping cost if applicable
    shipping_cost = 0
    if order_data.farming_decision.harvest_option == HarvestOption.SHIP_HOME:
        shipping_cost = 25.0  # Fixed shipping cost
    
    total_cost = plot_cost + machine_cost + fertilizer_cost + shipping_cost
    
    order = Order(
        **order_data.dict(),
        total_cost=total_cost,
        expected_yield_kg=expected_yield,
        expected_market_value=expected_market_value
    )
    await db.orders.insert_one(order.dict())
    
    # Mark plot as unavailable
    await db.plots.update_one({"id": order_data.plot_id}, {"$set": {"available": False}})
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    orders = await db.orders.find().to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return Order(**order)

@api_router.patch("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_update: OrderUpdate):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    update_data = order_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)

# Advisory system
@api_router.post("/advisories", response_model=Advisory)
async def create_advisory(advisory_data: AdvisoryCreate):
    advisory = Advisory(**advisory_data.dict())
    
    # Add advisory to order
    await db.orders.update_one(
        {"id": advisory_data.order_id},
        {"$push": {"advisories": advisory.dict()}}
    )
    
    return advisory

@api_router.get("/orders/{order_id}/advisories")
async def get_order_advisories(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    return order.get("advisories", [])

# Initialize sample data
@api_router.post("/reset-database")
async def reset_database():
    """Completely reset the database - remove all data"""
    await db.plots.delete_many({})
    await db.machines.delete_many({})
    await db.orders.delete_many({})
    return {"message": "Database completely reset"}

@api_router.post("/initialize-data")
async def initialize_sample_data():
    # COMPLETELY clear existing data first
    await db.machines.delete_many({})
    await db.plots.delete_many({})
    await db.orders.delete_many({})
    
    # Wait a moment to ensure deletion is complete
    import asyncio
    await asyncio.sleep(0.1)
    
    # Create sample plots
    sample_plots = [
        PlotCreate(
            name="A1 - Ritterfeld",
            soil_type=SoilType.SAND,
            soil_points=28,
            location="39291 Grabow",
            description="Sandiger Boden, 28 Bodenpunkte",
            price_per_plot=7.50,
            image_url="https://images.unsplash.com/photo-1613036582025-ba1d4ccb3226?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwyfHxzb2lsfGVufDB8fHx8MTc1MjgzMzA4NXww&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="B2 - Ritterfeld",
            soil_type=SoilType.LOAMY_SAND,
            soil_points=38,
            location="39291 Grabow",
            description="Lehmiger Sandboden, 38 Bodenpunkte",
            price_per_plot=9.00,
            image_url="https://images.unsplash.com/photo-1519462568576-0c687427fb2e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwzfHxzb2lsfGVufDB8fHx8MTc1MjgzMzA4NXww&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="C3 - Ritterfeld",
            soil_type=SoilType.CLAYEY_SAND,
            soil_points=42,
            location="39291 Grabow",
            description="Anlehmiger Sandboden, 42 Bodenpunkte",
            price_per_plot=10.00,
            image_url="https://images.pexels.com/photos/1000057/pexels-photo-1000057.jpeg"
        ),
        PlotCreate(
            name="D4 - Ritterfeld",
            soil_type=SoilType.SANDY_LOAM,
            soil_points=48,
            location="39291 Grabow",
            description="Sandiger Lehm, 48 Bodenpunkte - Premium Boden",
            price_per_plot=12.50,
            image_url="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxmZXJ0aWxlJTIwc29pbHxlbnwwfHx8fDE3NTI4NDU0NzJ8MA&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="E5 - Ritterfeld",
            soil_type=SoilType.SANDY_LOAM,
            soil_points=52,
            location="39291 Grabow",
            description="Sandiger Lehm, 52 Bodenpunkte - Premium Boden",
            price_per_plot=14.00,
            image_url="https://images.unsplash.com/photo-1492496913980-501348b61469?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxmZXJ0aWxlJTIwc29pbHxlbnwwfHx8fDE3NTI4NDU0NzJ8MA&ixlib=rb-4.1.0&q=85"
        )
    ]
    
    for plot_data in sample_plots:
        plot = Plot(
            id=str(uuid.uuid4()),
            name=plot_data.name,
            soil_type=plot_data.soil_type,
            soil_points=plot_data.soil_points,
            location=plot_data.location,
            description=plot_data.description,
            price_per_plot=plot_data.price_per_plot,
            image_url=plot_data.image_url,
            available=True,
            created_at=datetime.now()
        )
        await db.plots.insert_one(plot.dict())
    
    # Create exactly 16 unique machines
    machines_to_create = [
        # Bodenbearbeitung (3 machines)
        {"id": "traktor_john_deere_8r370", "name": "John Deere 8R370", "type": MachineType.TRAKTOR, "description": "Großtraktor (400 PS, 5 Min. Arbeitszeit)", "price_per_use": 6.50, "working_step": WorkingStep.BODENBEARBEITUNG, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.ERBSEN, CropType.SILOMAIS, CropType.ZUCKERRUEBEN]},
        {"id": "scheibenegge_01", "name": "Scheibenegge", "type": MachineType.SCHEIBENEGGE, "description": "Scheibenegge für Bodenbearbeitung", "price_per_use": 1.00, "working_step": WorkingStep.BODENBEARBEITUNG, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ERBSEN, CropType.ZUCKERRUEBEN]},
        {"id": "grubber_01", "name": "Grubber", "type": MachineType.GRUBBER, "description": "Bodenbearbeitungsgerät", "price_per_use": 1.20, "working_step": WorkingStep.BODENBEARBEITUNG, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ERBSEN]},
        
        # Aussaat (2 machines)
        {"id": "horsch_pronto_6dc", "name": "Horsch Pronto 6 DC", "type": MachineType.SAEMASCHINE, "description": "Drillmaschine (6m Arbeitsbreite)", "price_per_use": 0.80, "working_step": WorkingStep.AUSSAAT, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.ERBSEN]},
        {"id": "traktor_john_deere_7820", "name": "John Deere 7820", "type": MachineType.TRAKTOR_AUSSAAT, "description": "Traktor für Aussaat", "price_per_use": 5.50, "working_step": WorkingStep.AUSSAAT, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.ERBSEN, CropType.SILOMAIS]},
        
        # Pflanzenschutz (5 machines)
        {"id": "feldspritze_01", "name": "Feldspritze", "type": MachineType.FELDSPRITZE, "description": "Pflanzenschutzspritze", "price_per_use": 0.65, "working_step": WorkingStep.PFLANZENSCHUTZ, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        {"id": "traktor_john_deere_6r145", "name": "John Deere 6R145", "type": MachineType.TRAKTOR_PFLANZENSCHUTZ, "description": "Traktor für Pflanzenschutz", "price_per_use": 4.80, "working_step": WorkingStep.PFLANZENSCHUTZ, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        {"id": "hacke_01", "name": "Hacke", "type": MachineType.HACKE, "description": "Hackgerät für biologischen Anbau", "price_per_use": 1.15, "working_step": WorkingStep.PFLANZENSCHUTZ, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        {"id": "striegel_01", "name": "Striegel", "type": MachineType.STRIEGEL, "description": "Striegelgerät für biologischen Anbau", "price_per_use": 0.85, "working_step": WorkingStep.PFLANZENSCHUTZ, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        
        # Düngung (5 machines)
        {"id": "john_deere_6r195_mineral", "name": "John Deere 6R195 + Mineraldüngerstreuer", "type": MachineType.TRAKTOR_DUENGUNG, "description": "Traktor mit Mineraldüngerstreuer", "price_per_use": 6.50, "working_step": WorkingStep.DUENGUNG, "fertilizer_type": "mineral", "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        {"id": "john_deere_6r195_guellefass", "name": "John Deere 6R195 + 18m Güllefass", "type": MachineType.TRAKTOR_DUENGUNG, "description": "Traktor mit Güllefass für Rindergülle/Schweinegülle/Gärrest", "price_per_use": 7.30, "working_step": WorkingStep.DUENGUNG, "fertilizer_type": "organic_liquid", "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        {"id": "miststreuer", "name": "Miststreuer", "type": MachineType.MISTSTREUER, "description": "Miststreuer für Rindermist", "price_per_use": 4.80, "working_step": WorkingStep.DUENGUNG, "fertilizer_type": "organic_solid", "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN]},
        
        # Pflege (2 machines)
        {"id": "cambridge_walze_01", "name": "Cambridge Walze", "type": MachineType.CAMBRIDGE_WALZE, "description": "Walze zur Bestockungsförderung", "price_per_use": 0.95, "working_step": WorkingStep.PFLEGE, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.ERBSEN]},
        {"id": "steine_sammeln_01", "name": "Steine sammeln", "type": MachineType.CAMBRIDGE_WALZE, "description": "Steine von der Fläche sammeln", "price_per_use": 1.50, "working_step": WorkingStep.PFLEGE, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.ERBSEN, CropType.SILOMAIS, CropType.ZUCKERRUEBEN]},
        
        # Ernte (4 machines)
        {"id": "john_deere_t660i", "name": "John Deere T660i Mähdrescher", "type": MachineType.MAEHDRESCHER, "description": "Getreidemähdrescher", "price_per_use": 4.10, "working_step": WorkingStep.ERNTE, "suitable_for": [CropType.WINTERWEIZEN, CropType.WINTERROGGEN, CropType.WINTERGERSTE, CropType.WINTERTRITICALE, CropType.ERBSEN]},
        {"id": "mais_claas_jaguar_940", "name": "Mais-Claas Jaguar 940", "type": MachineType.MAIS_HAECKSLER, "description": "Spezialhäcksler für Silomais", "price_per_use": 4.20, "working_step": WorkingStep.ERNTE, "suitable_for": [CropType.SILOMAIS]},
        {"id": "gras_claas_jaguar_940", "name": "Gras-Claas Jaguar 940", "type": MachineType.GRAS_HAECKSLER, "description": "Häcksler für Gras", "price_per_use": 3.80, "working_step": WorkingStep.ERNTE, "suitable_for": [CropType.GRAS]},
        {"id": "ganzpflanzensilage_claas_jaguar_940", "name": "Ganzpflanzensilage-Claas Jaguar 940", "type": MachineType.MAIS_HAECKSLER, "description": "Häcksler für Roggen-Ganzpflanzensilage", "price_per_use": 4.00, "working_step": WorkingStep.ERNTE, "suitable_for": [CropType.WINTERROGGEN]}
    ]
    
    # Initialize database with sample data
    await db.machines.delete_many({})
    await db.plots.delete_many({})
    
    # Create 5 sample plots
    for plot_data in sample_plots:
        plot = Plot(
            id=str(uuid.uuid4()),
            name=plot_data.name,
            soil_type=plot_data.soil_type,
            soil_points=plot_data.soil_points,
            location=plot_data.location,
            description=plot_data.description,
            price_per_plot=plot_data.price_per_plot,
            image_url=plot_data.image_url,
            available=True,
            created_at=datetime.now()
        )
        await db.plots.insert_one(plot.dict())

    # Create 18 sample machines
    machine_count = 0
    for machine_data in machines_to_create:
        machine = Machine(
            id=machine_data["id"],
            name=machine_data["name"],
            type=machine_data["type"],
            description=machine_data["description"],
            price_per_use=machine_data["price_per_use"],
            suitable_for=machine_data["suitable_for"],
            working_step=machine_data["working_step"],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        )
        await db.machines.insert_one(machine.dict())
        machine_count += 1
    
    return {"message": f"Datenbank erfolgreich initialisiert: {len(sample_plots)} Parzellen, {machine_count} Maschinen"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()