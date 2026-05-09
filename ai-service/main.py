from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from datetime import datetime, timedelta

app = FastAPI(
    title="Mindshire AI Service",
    description="Python FastAPI microservice for behavioral insights and RPG nudges."
)

# Setup MongoDB Connection
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/mindshire_db")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database()

@app.get("/insights/{user_id}")
async def get_insights(user_id: str):
    """Returns behavioral pattern summary: best focus hours, procrastination score, topic efficiency."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    user_oid = ObjectId(user_id)
    
    # En iyi odaklanma saatini bulmak için Aggregation Pipeline
    pipeline = [
        {"$match": {"userId": user_oid, "eventType": "pomodoro_completed"}},
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "total_duration": {"$sum": "$durationMinutes"}
        }},
        {"$sort": {"total_duration": -1}},
        {"$limit": 1}
    ]
    
    best_hour_cursor = db.behaviorlogs.aggregate(pipeline)
    best_hours = await best_hour_cursor.to_list(length=1)
    
    # Eğer veri yoksa varsayılan saatler döndür
    best_hour_str = f"{best_hours[0]['_id']:02d}:00 - {best_hours[0]['_id'] + 1:02d}:00" if best_hours else "Veri yetersiz (Örn: 14:00)"
    
    return {
        "best_focus_hours": best_hour_str,
        # Gerçek uygulamada tüm "task_completed" loglarının delta ortalaması alınır
        "procrastination_score": 35, 
        "topic_efficiency": {
            "Yazılım": 85,
            "Matematik": 60,
            "Tasarım": 92
        }
    }

@app.get("/focus-score/{user_id}")
async def get_focus_score(user_id: str):
    """Returns today's focus quality score (0-100)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    # Bugünün başlangıcını hesapla
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Bugün içindeki tüm behavior logları getir
    cursor = db.behaviorlogs.find({
        "userId": ObjectId(user_id),
        "timestamp": {"$gte": today}
    })
    
    logs = await cursor.to_list(length=100)
    
    # Basit Algoritma: Tamamlanan her pomodoro için 20 puan (Max 100)
    pomodoros = sum(1 for log in logs if log.get("eventType") == "pomodoro_completed")
    score = min(100, pomodoros * 20)
    
    # Eğer bugün hiç pomodoro yoksa teşvik için 10 puan verelim
    if score == 0:
        score = 10 
        
    return {
        "focus_score": score,
        "date": today.date().isoformat()
    }

@app.post("/nudge/{user_id}")
async def get_nudge(user_id: str):
    """Returns an RPG-themed break recommendation if the user needs rest."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid User ID")
        
    # Burada gerçek bir senaryoda kullanıcının ne kadar süredir aralıksız çalıştığı hesaplanır.
    # Şimdilik statik bir RPG temalı tavsiye döndürüyoruz.
    
    return {
        "message": "Karakterin çok yoruldu! Wanderer's Inn'de (Gezgin Hanı) biraz dinlenmelisin. Zihnini toparla ve görevlerine daha güçlü dön.",
        "action_recommended": "take_break",
        "duration_recommended_minutes": 15,
        "rpg_theme": "tavern_rest"
    }

if __name__ == "__main__":
    import uvicorn
    # Çalıştırmak için: python main.py veya uvicorn main:app --reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
