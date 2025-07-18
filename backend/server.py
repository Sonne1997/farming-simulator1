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

class CultivationMethod(str, Enum):
    KONVENTIONELL = "konventionell"
    BIOLOGISCH = "biologisch"

class MachineType(str, Enum):
    TRAKTOR = "traktor"
    PFLUG = "pflug"
    SAEMASCHINE = "saemaschine"
    MAEHDRESCHER = "maehdrescher"
    FELDSPRITZE = "feldspritze"
    GRUBBER = "grubber"

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

# Market prices per ton (in EUR)
MARKET_PRICES = {
    CropType.WEIZEN: 170.0,
    CropType.ROGGEN: 155.0,
    CropType.GERSTE: 160.0,
    CropType.TRITICALE: 165.0,
    CropType.SILOMAIS: 45.0,
    CropType.ZUCKERRUEBEN: 35.0,
    CropType.LUZERNE: 180.0,
    CropType.GRAS: 120.0,
    CropType.BLUEHMISCHUNG: 0.0,  # No market value
    CropType.ERBSEN: 280.0
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

# Machine costs (based on actual costs)
MACHINE_COSTS = {
    "traktor_5min": 2.73,  # John Deere 7820 for 5 minutes
    "drill_250m2": 0.80,   # Horsch Pronto 6 DC for 250m²
    "sprayer_250m2": 0.65,
    "harvester_250m2": 3.50,
    "cultivator_250m2": 1.20
}

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

class FarmingDecision(BaseModel):
    cultivation_method: CultivationMethod
    crop_type: CropType
    cultivation_machines: List[str]  # machine IDs
    protection_machines: List[str]  # machine IDs
    care_machines: List[str]  # machine IDs
    harvest_option: HarvestOption
    shipping_address: Optional[str] = None

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

@api_router.get("/machine-costs")
async def get_machine_costs():
    return MACHINE_COSTS

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
            name="Parzelle A1 - Sandfeld",
            soil_type=SoilType.SAND,
            soil_points=28,
            location="Nordfeld, Bayern",
            description="Sandiger Boden, 28 Bodenpunkte",
            price_per_plot=7.50,
            image_url="https://images.unsplash.com/photo-1529313780224-1a12b68bed16?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="Parzelle B2 - Lehmiges Sandfeld",
            soil_type=SoilType.LOAMY_SAND,
            soil_points=38,
            location="Südtal, Bayern",
            description="Lehmiger Sandboden, 38 Bodenpunkte",
            price_per_plot=9.00,
            image_url="https://images.unsplash.com/photo-1523539693385-e5e891eb4465?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="Parzelle C3 - Premium Boden",
            soil_type=SoilType.CLAYEY_SAND,
            soil_points=42,
            location="Osthang, Bayern",
            description="Anlehmiger Sandboden, 42 Bodenpunkte",
            price_per_plot=10.00,
            image_url="https://images.unsplash.com/photo-1492496913980-501348b61469?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwyfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85"
        )
    ]
    
    for plot_data in sample_plots:
        plot = Plot(**plot_data.dict())
        await db.plots.insert_one(plot.dict())
    
    # Create sample machines
    sample_machines = [
        MachineCreate(
            name="Fendt 314 Vario",
            type=MachineType.TRAKTOR,
            description="Kompakter Traktor für alle Arbeiten",
            price_per_use=45.0,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        MachineCreate(
            name="Amazone Sämaschine",
            type=MachineType.SAEMASCHINE,
            description="Präzisionssämaschine für Getreide",
            price_per_use=35.0,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        MachineCreate(
            name="Feldspritze",
            type=MachineType.FELDSPRITZE,
            description="Präzise Pflanzenschutzspritze",
            price_per_use=25.0,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.SILOMAIS, CropType.ZUCKERRUEBEN],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        ),
        MachineCreate(
            name="Claas Lexion Mähdrescher",
            type=MachineType.MAEHDRESCHER,
            description="Moderner Mähdrescher für Getreide",
            price_per_use=120.0,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        MachineCreate(
            name="Grubber",
            type=MachineType.GRUBBER,
            description="Bodenbearbeitungsgerät für Stoppelbearbeitung",
            price_per_use=30.0,
            suitable_for=[CropType.WEIZEN, CropType.ROGGEN, CropType.GERSTE, CropType.TRITICALE, CropType.SILOMAIS],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        MachineCreate(
            name="Mais-Häcksler",
            type=MachineType.MAEHDRESCHER,
            description="Spezialhäcksler für Silomais",
            price_per_use=80.0,
            suitable_for=[CropType.SILOMAIS],
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