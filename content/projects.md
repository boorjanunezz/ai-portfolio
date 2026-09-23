# Proyectos

<!--
  Un proyecto por cada sección "##".
  Campos reconocidos por la web:
    Tecnologías: lista separada por comas
    GitHub:      URL del repositorio
    Demo:        URL de la demo
    Imagen:      ruta dentro de /public (p. ej. /projects/mi-proyecto.png)
  El resto del texto es la descripción. Todo el texto lo usa también el asistente.
-->

## Chatbot de Compliance Legal (TFM)

Trabajo de Fin de Máster desarrollado para Ricoh España: chatbot RAG que permite consultar de forma interactiva normativa europea (RGPD, AI Act y NIS2) con citación rigurosa de las fuentes en cada respuesta. Los documentos se procesan con una arquitectura Medallón (bronze, silver, gold): Azure Document Intelligence extrae el contenido, los embeddings se almacenan en Supabase y las respuestas se generan con OpenAI.

Tecnologías: Python, Azure Document Intelligence, OpenAI, Supabase, RAG, arquitectura Medallón
GitHub: https://github.com/boorjanunezz/TFM-Ricoh
Demo:
Imagen:

## SmartInvoice-ETL

Pipeline ETL que digitaliza facturas: extrae de PDFs no estructurados los campos clave (número, fecha, cliente, NIF e importe) con Azure Document Intelligence y los carga en SQL Server. Incluye un modo de simulación con datos generados con Faker para desarrollar y probar sin coste de Azure, logging y gestión de errores con carpetas de procesados y fallidos.

Tecnologías: Python, Azure Document Intelligence, SQL Server, Faker
GitHub: https://github.com/boorjanunezz/SmartInvoice-ETL
Demo:
Imagen:

## Portfolio con asistente de IA

Portfolio personal cuya interfaz principal es un asistente de IA que responde preguntas sobre el perfil de Borja. Usa un RAG ligero sin base de datos: los documentos Markdown del repositorio se dividen en fragmentos, se recuperan los más relevantes con BM25 y solo esos fragmentos se envían al modelo Gemini. El asistente rechaza preguntas no relacionadas con Borja y muestra las fuentes utilizadas en cada respuesta.

Tecnologías: Next.js, TypeScript, Tailwind CSS, Gemini API, Vercel
GitHub: https://github.com/boorjanunezz/ai-portfolio
Demo: PLACEHOLDER
Imagen:

## MindfulAI

Aplicación web de apoyo emocional con IA. Incluye un chat empático con Qwen 2.5 72B a través de HuggingFace Inference, con un prompt de sistema basado en técnicas de TCC y mindfulness y detección de crisis que ofrece recursos de emergencia. Añade un ejercicio de respiración guiada y un registro de estado de ánimo con gráfico de evolución, guardado solo en el navegador.

Tecnologías: React, Vite, HuggingFace Inference API, Qwen 2.5 72B, Framer Motion, Vercel
GitHub: https://github.com/boorjanunezz/MentalHealth-AI
Demo: https://mental-health-1ie0htezs-boorjanunezzs-projects.vercel.app/
Imagen:

## Agente de análisis de noticias con LangGraph

Agente de IA construido con LangGraph que analiza noticias usando modelos de Azure OpenAI desplegados en Azure AI Foundry. Evolución de un proyecto anterior de agentes con LangChain.

Tecnologías: Python, LangGraph, LangChain, Azure OpenAI, Azure AI Foundry
GitHub:
Demo:
Imagen:

## Bot de Telegram con n8n y Azure AI Foundry

Bot de Telegram con personalidad de campesino mexicano, orquestado con n8n. Entiende notas de voz con Whisper, genera respuestas con GPT-4o-mini y contesta también por voz con TTS-HD.

Tecnologías: n8n, Telegram, Azure AI Foundry, GPT-4o-mini, Whisper, TTS-HD
GitHub:
Demo:
Imagen:

## Exploración de Azure AI Foundry

Prácticas con modelos desplegados en Azure AI Foundry: guardrails y filtros de contenido, modelos de razonamiento y modelos multimodales aplicados al análisis de imágenes.

Tecnologías: Python, Jupyter, Azure AI Foundry
GitHub: https://github.com/boorjanunezz/Foundry_Exploration
Demo:
Imagen:

## Neural Network Playground

App en Streamlit que despliega dos modelos: una CNN que reconoce dígitos manuscritos y un predictor de precios de viviendas. Publicada en Streamlit Community Cloud.

Tecnologías: Python, TensorFlow, Keras, Streamlit
GitHub:
Demo:
Imagen:

## Prácticas de IA generativa

Módulo de IA generativa del máster: prompt engineering, fine-tuning, embeddings, RAG y SaaS con Azure OpenAI, además de redes neuronales (RNA, CNN y VAE).

Tecnologías: Python, Jupyter, Azure OpenAI, Keras, TensorFlow
GitHub: https://github.com/boorjanunezz/Inteligencia-Artificial-Generativa
Demo:
Imagen:

## GeoMaster

Juego de geografía en el navegador sobre un mapa mundial interactivo en SVG: 175 países, 6 modos de juego (localizar país, contrarreloj, nombre, banderas, capitales y exploración libre), 7 regiones y 3 dificultades. Interfaz bilingüe ES/EN, tema claro y oscuro y récords locales. Sin framework, sin bundler y sin backend.

Tecnologías: JavaScript, D3, TopoJSON, SVG, GitHub Pages
GitHub: https://github.com/boorjanunezz/GeoMaster
Demo: https://boorjanunezz.github.io/GeoMaster/
Imagen:
