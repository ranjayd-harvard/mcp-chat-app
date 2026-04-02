"""
Kafka MCP Server
Provides tools to interact with a local Kafka cluster
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

import uuid
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer, TopicPartition
from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from aiokafka.errors import TopicAlreadyExistsError, UnknownTopicOrPartitionError

load_dotenv()

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

app = FastAPI(
    title="Kafka MCP Server",
    description="Interact with a local Kafka cluster via MCP protocol",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Pydantic Models
# ============================================

class CreateTopicRequest(BaseModel):
    topic: str = Field(..., description="Topic name")
    num_partitions: int = Field(default=1, description="Number of partitions")
    replication_factor: int = Field(default=1, description="Replication factor")

class ProduceMessageRequest(BaseModel):
    topic: str = Field(..., description="Target topic name")
    message: str = Field(..., description="Message value (string)")
    key: Optional[str] = Field(None, description="Optional message key")
    headers: Optional[Dict[str, str]] = Field(None, description="Optional message headers")

class ConsumeMessagesRequest(BaseModel):
    topic: str = Field(..., description="Topic to consume from")
    max_messages: int = Field(default=10, description="Maximum number of messages to return (returns the most recent N messages)")


# ============================================
# Topic Management Endpoints
# ============================================

@app.get("/topics", operation_id="list_topics")
async def list_topics():
    """
    [Kafka MCP] List all topics in the local Kafka cluster (event stream names).
    Use this to discover what event channels exist — not to list database tables or API resources.
    Topics represent streams of events (e.g. orders, payments, logs), not structured records.
    """
    admin = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await admin.start()
        topics = await admin.list_topics()
        user_topics = sorted([t for t in topics if not t.startswith("__")])
        return {"topics": user_topics, "count": len(user_topics)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list topics: {str(e)}")
    finally:
        await admin.close()


@app.post("/topics", operation_id="create_topic")
async def create_topic(request: CreateTopicRequest):
    """
    [Kafka MCP] Create a new Kafka topic (event stream channel).
    Use this to set up a new message queue or event pipeline — not to create database tables or API resources.
    """
    admin = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await admin.start()
        new_topic = NewTopic(
            name=request.topic,
            num_partitions=request.num_partitions,
            replication_factor=request.replication_factor
        )
        await admin.create_topics([new_topic])
        return {
            "created": True,
            "topic": request.topic,
            "num_partitions": request.num_partitions,
            "replication_factor": request.replication_factor
        }
    except TopicAlreadyExistsError:
        raise HTTPException(status_code=409, detail=f"Topic '{request.topic}' already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create topic: {str(e)}")
    finally:
        await admin.close()


@app.delete("/topics/{topic}", operation_id="delete_topic")
async def delete_topic(topic: str):
    """
    [Kafka MCP] Permanently delete a Kafka topic and all its messages from the cluster.
    This removes the event stream entirely — not a database record or API resource.
    """
    admin = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await admin.start()
        await admin.delete_topics([topic])
        return {"deleted": True, "topic": topic}
    except UnknownTopicOrPartitionError:
        raise HTTPException(status_code=404, detail=f"Topic '{topic}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete topic: {str(e)}")
    finally:
        await admin.close()


@app.get("/topics/{topic}", operation_id="get_topic_info")
async def get_topic_info(topic: str):
    """
    [Kafka MCP] Get partition count and earliest/latest offsets for a Kafka topic.
    Use this to inspect the size and layout of an event stream — not to query a database table.
    """
    admin = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    consumer = AIOKafkaConsumer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await admin.start()
        topics = await admin.list_topics()
        if topic not in topics:
            raise HTTPException(status_code=404, detail=f"Topic '{topic}' not found")

        # Use admin describe_topics for reliable partition metadata
        topic_metadata = await admin.describe_topics([topic])
        partition_ids = [p['partition'] for p in topic_metadata[0]['partitions']]
        tps = [TopicPartition(topic, p) for p in partition_ids]

        # Assign explicitly — no group rebalancing needed
        await consumer.start()
        consumer.assign(tps)

        beginning_offsets = await consumer.beginning_offsets(tps)
        end_offsets = await consumer.end_offsets(tps)

        partition_info = []
        for tp in tps:
            start = beginning_offsets.get(tp, 0)
            end = end_offsets.get(tp, 0)
            partition_info.append({
                "partition": tp.partition,
                "earliest_offset": start,
                "latest_offset": end,
                "message_count": max(0, end - start)
            })

        return {
            "topic": topic,
            "partition_count": len(partition_ids),
            "partitions": sorted(partition_info, key=lambda x: x["partition"])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get topic info: {str(e)}")
    finally:
        await admin.close()
        await consumer.stop()


# ============================================
# Produce / Consume Endpoints
# ============================================

@app.post("/produce", operation_id="produce_message")
async def produce_message(request: ProduceMessageRequest):
    """
    [Kafka MCP] Publish a message (event) to a Kafka topic.
    Use this to send events into a stream pipeline — not to insert records into a database.
    If the user says 'add to orders' and an orders Kafka topic exists, confirm whether they mean
    the Kafka event stream or a database table before calling this.
    """
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await producer.start()
        key_bytes = request.key.encode() if request.key else None
        headers = [(k, v.encode()) for k, v in (request.headers or {}).items()]

        record_metadata = await producer.send_and_wait(
            request.topic,
            value=request.message.encode(),
            key=key_bytes,
            headers=headers if headers else None
        )
        return {
            "produced": True,
            "topic": record_metadata.topic,
            "partition": record_metadata.partition,
            "offset": record_metadata.offset,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to produce message: {str(e)}")
    finally:
        await producer.stop()


@app.post("/consume", operation_id="consume_messages")
async def consume_messages(request: ConsumeMessagesRequest):
    """
    [Kafka MCP] Read the most recent N messages from a Kafka topic (event stream).
    Use this to inspect event history in a stream pipeline — not to query database records.
    If the user asks to 'read orders' and both a Kafka orders topic and a database orders table exist,
    ask which source they mean before calling this.

    Args:
        request: Topic name, max messages to fetch, whether to start from the beginning, and poll timeout

    Returns:
        List of messages with their key, value, partition, offset, and timestamp
    """
    admin = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    consumer = AIOKafkaConsumer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await admin.start()
        topics = await admin.list_topics()
        if request.topic not in topics:
            raise HTTPException(status_code=404, detail=f"Topic '{request.topic}' not found")

        topic_metadata = await admin.describe_topics([request.topic])
        partition_ids = [p['partition'] for p in topic_metadata[0]['partitions']]
        tps = [TopicPartition(request.topic, p) for p in partition_ids]

        await consumer.start()
        consumer.assign(tps)

        end_offsets = await consumer.end_offsets(tps)

        # Seek each partition to max(0, end - max_messages) so we read
        # the last N messages across all partitions
        for tp in tps:
            end = end_offsets.get(tp, 0)
            seek_to = max(0, end - request.max_messages)
            consumer.seek(tp, seek_to)

        messages = []
        batch = await consumer.getmany(timeout_ms=3000, max_records=request.max_messages)
        for tp, records in batch.items():
            for record in records:
                messages.append({
                    "topic": record.topic,
                    "partition": record.partition,
                    "offset": record.offset,
                    "key": record.key.decode() if record.key else None,
                    "value": record.value.decode() if record.value else None,
                    "timestamp": record.timestamp
                })

        messages.sort(key=lambda m: m["timestamp"])
        messages = messages[-request.max_messages:]

        return {
            "topic": request.topic,
            "messages_returned": len(messages),
            "messages": messages
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to consume messages: {str(e)}")
    finally:
        await admin.close()
        await consumer.stop()


# ============================================
# Health & Info Endpoints
# ============================================

@app.get("/")
async def root():
    return {
        "service": "Kafka MCP Server",
        "version": "1.0.0",
        "status": "active",
        "kafka_bootstrap": KAFKA_BOOTSTRAP_SERVERS,
        "endpoints": {
            "list_topics":   "GET  /topics",
            "create_topic":  "POST /topics",
            "delete_topic":  "DELETE /topics/{topic}",
            "topic_info":    "GET  /topics/{topic}",
            "produce":       "POST /produce",
            "consume":       "POST /consume"
        }
    }


@app.get("/health")
async def health():
    admin = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    try:
        await admin.start()
        await admin.list_topics()
        kafka_status = "connected"
    except Exception as e:
        kafka_status = f"unreachable: {str(e)}"
    finally:
        try:
            await admin.close()
        except Exception:
            pass

    return {
        "status": "healthy" if kafka_status == "connected" else "degraded",
        "kafka": kafka_status,
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    import uvicorn

    PORT = int(os.getenv("KAFKA_MCP_PORT", 8003))

    print("\n" + "="*70)
    print("Kafka MCP Server")
    print("="*70)
    print(f"Server:    http://localhost:{PORT}")
    print(f"Docs:      http://localhost:{PORT}/docs")
    print(f"Health:    http://localhost:{PORT}/health")
    print(f"Kafka:     {KAFKA_BOOTSTRAP_SERVERS}")
    print("="*70 + "\n")

    uvicorn.run(
        "kafka_mcp:app",
        host="0.0.0.0",
        port=PORT,
        reload=True
    )
