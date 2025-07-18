from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums for farming choices
class SoilType(str, Enum):
    SAND = "sand"
    LOAMY_SAND = "loamy_sand"
    CLAYEY_SAND = "clayey_sand"

class CropType(str, Enum):
    ROGGEN = "roggen"
    WEIZEN = "weizen"
    GERSTE = "gerste"
    TRITICALE = "triticale"
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

class CultivationMethod(str, Enum):
    KONVENTIONELL = "konventionell"
    BIOLOGISCH = "biologisch"

class MachineType(str, Enum):
    TRAKTOR = "traktor"
    PFLUG = "pflug"
    GRUBBER = "grubber"
    SAEMASCHINE = "saemaschine"
    MAEHDRESCHER = "maehdrescher"
    FELDSPRITZE = "feldspritze"
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

class HarvestOption(str, Enum):
    SHIP_HOME = "ship_home"
    SELL_TO_FARMER = "sell_to_farmer"

# Market prices per ton (in EUR) - updated with real prices
MARKET_PRICES = {
    CropType.WEIZEN: 170.0,
    CropType.ROGGEN: 155.0,  # Normal roggen
    CropType.GERSTE: 150.0,
    CropType.TRITICALE: 165.0,
    CropType.SILOMAIS: 45.0,
    CropType.ZUCKERRUEBEN: 35.0,
    CropType.LUZERNE: 180.0,
    CropType.GRAS: 120.0,
    CropType.BLUEHMISCHUNG: 0.0,  # No market value - only subsidies
    CropType.ERBSEN: 250.0
}

# Real yields per 250m² based on Grabow location (in kg)
REAL_YIELDS_250M2 = {
    CropType.WEIZEN: 125.0,      # 5 t/ha × 0.025 = 125 kg
    CropType.ROGGEN: 75.0,       # 3 t/ha × 0.025 = 75 kg
    CropType.GERSTE: 100.0,      # 4 t/ha × 0.025 = 100 kg
    CropType.TRITICALE: 100.0,   # 4 t/ha × 0.025 = 100 kg
    CropType.SILOMAIS: 1200.0,   # Keeping existing estimate
    CropType.ZUCKERRUEBEN: 1375.0, # 55 t/ha × 0.025 = 1375 kg
    CropType.LUZERNE: 150.0,     # 6 t/ha × 0.025 = 150 kg
    CropType.GRAS: 200.0,        # 8 t/ha × 0.025 = 200 kg
    CropType.BLUEHMISCHUNG: 0.0, # No harvest
    CropType.ERBSEN: 50.0        # 2 t/ha × 0.025 = 50 kg
}

# Market values per 250m² plot (in EUR)
MARKET_VALUES_250M2 = {
    CropType.WEIZEN: 21.25,      # 125 kg × 170€/t = 21.25€
    CropType.ROGGEN: 11.63,      # 75 kg × 155€/t = 11.63€
    CropType.GERSTE: 15.00,      # 100 kg × 150€/t = 15.00€
    CropType.TRITICALE: 16.50,   # 100 kg × 165€/t = 16.50€
    CropType.SILOMAIS: 54.00,    # 1200 kg × 45€/t = 54.00€
    CropType.ZUCKERRUEBEN: 48.13, # 1375 kg × 35€/t = 48.13€
    CropType.LUZERNE: 27.00,     # 150 kg × 180€/t = 27.00€
    CropType.GRAS: 24.00,        # 200 kg × 120€/t = 24.00€
    CropType.BLUEHMISCHUNG: 0.0, # Only subsidies
    CropType.ERBSEN: 12.50       # 50 kg × 250€/t = 12.50€
}

# Base yield per 250m² (in kg) at 35 soil points
YIELD_BASE = {
    CropType.WEIZEN: 180.0,
    CropType.ROGGEN: 150.0,
    CropType.GERSTE: 160.0,
    CropType.TRITICALE: 170.0,
    CropType.SILOMAIS: 1200.0,
    CropType.ZUCKERRUEBEN: 1600.0,
    CropType.LUZERNE: 250.0,
    CropType.GRAS: 300.0,
    CropType.BLUEHMISCHUNG: 0.0,  # No harvest
    CropType.ERBSEN: 120.0
}

# Expected yield per 250m² (in kg) - varies by soil points
EXPECTED_YIELDS = {
    CropType.WEIZEN: 180.0,
    CropType.ROGGEN: 150.0,
    CropType.GERSTE: 160.0,
    CropType.TRITICALE: 170.0,
    CropType.SILOMAIS: 1200.0,
    CropType.ZUCKERRUEBEN: 1600.0,
    CropType.LUZERNE: 250.0,
    CropType.GRAS: 300.0,
    CropType.BLUEHMISCHUNG: 0.0,  # No harvest
    CropType.ERBSEN: 120.0
}

# Seed costs per 250m² (in EUR)
SEED_COSTS = {
    CropType.WEIZEN: 2.10,  # 150kg/ha * 0.025ha * 0.56€/kg = 2.10€
    CropType.ROGGEN: 1.75,
    CropType.GERSTE: 1.90,
    CropType.TRITICALE: 1.85,
    CropType.SILOMAIS: 12.50,
    CropType.ZUCKERRUEBEN: 35.00,
    CropType.LUZERNE: 8.75,
    CropType.GRAS: 3.25,
    CropType.BLUEHMISCHUNG: 15.00,
    CropType.ERBSEN: 6.25
}

# Fertilizer specifications
FERTILIZER_SPECS = {
    FertilizerType.SSA: {
        "name": "Schwefelsaurer Ammoniak (SSA)",
        "n_content": 21,  # % Stickstoff
        "s_content": 24,  # % Schwefel
        "price_per_kg": 0.42,  # EUR/kg
        "organic": False
    },
    FertilizerType.KAS: {
        "name": "Kalkammonsalpeter (KAS)",
        "n_content": 27,  # % Stickstoff
        "s_content": 0,
        "price_per_kg": 0.45,  # EUR/kg
        "organic": False
    },
    FertilizerType.SCHWEINEGULLE: {
        "name": "Schweinegülle",
        "n_content": 0.4,  # % Stickstoff (4 kg N/m³)
        "s_content": 0,
        "price_per_m3": 8.50,  # EUR/m³
        "organic": True
    },
    FertilizerType.RINDERGUELLE: {
        "name": "Rindergülle",
        "n_content": 0.35,  # % Stickstoff (3.5 kg N/m³)
        "s_content": 0,
        "price_per_m3": 7.80,  # EUR/m³
        "organic": True
    },
    FertilizerType.GAERREST: {
        "name": "Gärrest (Biogasanlage)",
        "n_content": 0.45,  # % Stickstoff (4.5 kg N/m³)
        "s_content": 0,
        "price_per_m3": 9.20,  # EUR/m³
        "organic": True
    }
}

# Nitrogen requirements per crop (kg N per ton of expected yield)
N_REQUIREMENTS = {
    CropType.WEIZEN: 23.0,  # kg N/t Ertrag
    CropType.ROGGEN: 20.0,
    CropType.GERSTE: 18.0,
    CropType.TRITICALE: 21.0,
    CropType.SILOMAIS: 2.8,   # kg N/t Frischmasse
    CropType.ZUCKERRUEBEN: 1.8,
    CropType.LUZERNE: 0.0,    # Leguminose - bindet selbst Stickstoff
    CropType.GRAS: 15.0,
    CropType.BLUEHMISCHUNG: 8.0,
    CropType.ERBSEN: 0.0      # Leguminose - bindet selbst Stickstoff
}

# Roggen Ganzpflanzensilage pricing (updated with real data)
ROGGEN_GPS_YIELD_PER_250M2 = 75.0   # kg (3t/ha × 0.025 = 75kg)
ROGGEN_GPS_PRICE_PER_TON = 38.0      # EUR/t (real price)
ROGGEN_GPS_VALUE_250M2 = (ROGGEN_GPS_YIELD_PER_250M2 / 1000) * ROGGEN_GPS_PRICE_PER_TON  # 2.85€

# Data Models
class Plot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    size_m2: float = 250.0  # All plots are 250m²
    length_m: float = 18.0
    width_m: float = 13.8
    soil_type: SoilType
    soil_points: int = Field(ge=25, le=45)  # Soil quality points 25-45
    location: str
    description: str
    price_per_plot: float
    available: bool = True
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlotCreate(BaseModel):
    name: str
    soil_type: SoilType
    soil_points: int = Field(ge=25, le=45)
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
    image_url: Optional[str] = None

class MachineCreate(BaseModel):
    name: str
    type: MachineType
    description: str
    price_per_use: float
    suitable_for: List[CropType]
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

@api_router.post("/machines", response_model=Machine)
async def create_machine(machine_data: MachineCreate):
    machine = Machine(**machine_data.dict())
    await db.machines.insert_one(machine.dict())
    return machine

# Get expected yields based on soil points
@api_router.get("/expected-yields/{soil_points}")
async def get_expected_yields_by_soil(soil_points: int):
    if soil_points < 25 or soil_points > 45:
        raise HTTPException(status_code=400, detail="Bodenpunkte müssen zwischen 25 und 45 liegen")
    
    # Calculate yield multiplier (25 points = 0.8, 45 points = 1.2)
    yield_multiplier = 0.8 + (soil_points - 25) * 0.02
    
    adjusted_yields = {}
    for crop, base_yield in YIELD_BASE.items():
        adjusted_yields[crop] = base_yield * yield_multiplier
    
    return adjusted_yields

@api_router.get("/seed-costs")
async def get_seed_costs():
    return SEED_COSTS

@api_router.get("/fertilizer-specs")
async def get_fertilizer_specs():
    return FERTILIZER_SPECS

@api_router.get("/nitrogen-requirements")
async def get_nitrogen_requirements():
    return N_REQUIREMENTS

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
        if specs["organic"]:
            # Organic fertilizers (m³)
            n_content_per_m3 = specs["n_content"] * 10  # Convert % to kg/m³
            required_volume = n_requirement_kg / n_content_per_m3 if n_content_per_m3 > 0 else 0
            cost = required_volume * specs["price_per_m3"]
            
            options.append({
                "fertilizer_type": fert_type,
                "name": specs["name"],
                "required_amount": round(required_volume, 2),
                "unit": "m³",
                "cost": round(cost, 2),
                "organic": True
            })
        else:
            # Mineral fertilizers (kg)
            n_content_percent = specs["n_content"]
            required_amount = (n_requirement_kg / n_content_percent) * 100 if n_content_percent > 0 else 0
            cost = required_amount * specs["price_per_kg"]
            
            options.append({
                "fertilizer_type": fert_type,
                "name": specs["name"],
                "required_amount": round(required_amount, 2),
                "unit": "kg",
                "cost": round(cost, 2),
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
    all_machine_ids = (order_data.farming_decision.cultivation_machines + 
                      order_data.farming_decision.protection_machines + 
                      order_data.farming_decision.care_machines)
    
    machine_cost = 0
    for machine_id in all_machine_ids:
        machine = await db.machines.find_one({"id": machine_id})
        if machine:
            machine_cost += machine["price_per_use"]
    
    # Calculate expected yield and market value
    crop_type = order_data.farming_decision.crop_type
    expected_yield = EXPECTED_YIELDS.get(crop_type, 0)
    market_price_per_ton = MARKET_PRICES.get(crop_type, 0)
    expected_market_value = (expected_yield / 1000) * market_price_per_ton  # Convert kg to tons
    
    # Add shipping cost if applicable
    shipping_cost = 0
    if order_data.farming_decision.harvest_option == HarvestOption.SHIP_HOME:
        shipping_cost = 25.0  # Fixed shipping cost
    
    total_cost = plot_cost + machine_cost + shipping_cost
    
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
@api_router.post("/initialize-data")
async def initialize_sample_data():
    # Clear existing data
    await db.plots.delete_many({})
    await db.machines.delete_many({})
    
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
        )
    ]
    
    for plot_data in sample_plots:
        plot = Plot(**plot_data.dict())
        await db.plots.insert_one(plot.dict())
    
    # Create sample machines with realistic costs
    sample_machines = [
        # Bodenbearbeitung
        MachineCreate(
            name="John Deere 7820",
            type=MachineType.TRAKTOR,
            description="Traktor (5 Min. Arbeitszeit)",
            price_per_use=2.73,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        MachineCreate(
            name="Grubber",
            type=MachineType.GRUBBER,
            description="Bodenbearbeitungsgerät",
            price_per_use=1.20,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.SILOMAIS, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        # Aussaat
        MachineCreate(
            name="Horsch Pronto 6 DC",
            type=MachineType.SAEMASCHINE,
            description="Drillmaschine (6m Arbeitsbreite)",
            price_per_use=0.80,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        # Pflanzenschutz
        MachineCreate(
            name="Feldspritze",
            type=MachineType.FELDSPRITZE,
            description="Pflanzenschutzspritze",
            price_per_use=0.65,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        ),
        MachineCreate(
            name="Hacke",
            type=MachineType.HACKE,
            description="Hackgerät für biologischen Anbau",
            price_per_use=1.15,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        MachineCreate(
            name="Striegel",
            type=MachineType.STRIEGEL,
            description="Striegelgerät für biologischen Anbau",
            price_per_use=0.85,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        # Pflege
        MachineCreate(
            name="Cambridge Walze",
            type=MachineType.CAMBRIDGE_WALZE,
            description="Walze zur Bestockungsförderung",
            price_per_use=0.95,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        ),
        # Ernte
        MachineCreate(
            name="Mähdrescher",
            type=MachineType.MAEHDRESCHER,
            description="Getreidemähdrescher",
            price_per_use=3.50,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.ERBSEN],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        MachineCreate(
            name="Mais-Häcksler",
            type=MachineType.MAIS_HAECKSLER,
            description="Spezialhäcksler für Silomais",
            price_per_use=4.20,
            suitable_for=[CropType.SILOMAIS],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        ),
        MachineCreate(
            name="Gras-Häcksler",
            type=MachineType.GRAS_HAECKSLER,
            description="Häcksler für Gras",
            price_per_use=3.80,
            suitable_for=[CropType.GRAS],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        ),
        MachineCreate(
            name="Häcksler (Ganzpflanzensilage)",
            type=MachineType.MAIS_HAECKSLER,
            description="Häcksler für Roggen-Ganzpflanzensilage",
            price_per_use=4.00,
            suitable_for=[CropType.ROGGEN],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        )
    ]
    
    for machine_data in sample_machines:
        machine = Machine(**machine_data.dict())
        await db.machines.insert_one(machine.dict())
    
    return {"message": "Beispieldaten erfolgreich initialisiert"}

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