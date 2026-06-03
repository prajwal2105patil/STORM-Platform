# STORM: Scalable Temporal Observatory for Regional Meteorology

A production-grade, fault-tolerant Big Data platform processing 1+ TB 
of multi-decade global weather data using Apache Spark on Google Cloud Dataproc.

## Architecture
- **Storage:** Google Cloud Storage (disaggregated data lake)
- **Processing:** Apache Spark 3.x on Google Cloud Dataproc
- **Data:** NOAA ISD Global Surface Data 2015-2024 (~100GB+)
- **ML:** Spark MLlib - Anomaly Detection + Temperature Forecasting
- **Streaming:** Kafka + Spark Structured Streaming
- **Dashboard:** Streamlit

## Pipeline Architecture
```
NOAA ISD (Source)
      │
      
GCS Bronze Layer (Raw ASCII)
      │
      
GCS Silver Layer (Parsed Parquet)
      │
      
GCS Gold Layer (Aggregated)
      │
      ├── Spark MLlib (Anomaly Detection + Forecasting)
      └── Streamlit Dashboard
```

## Status
⏳ Week 1 - Bronze layer ingestion in progress

## Benchmarks
| Configuration | Ingestion | Query Latency |
|---|---|---|
| Single Node (baseline) | TBD | TBD |
| Dataproc 4-node | TBD | TBD |

## Paper
Under preparation - IEEE Big Data Conference
