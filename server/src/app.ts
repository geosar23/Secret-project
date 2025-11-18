import express from 'express'
import cors from 'cors'
import apiRouter from './api/routes'
import errorMiddleware from './core/middleware/error.middleware'

const app = express()

app.use(cors())
app.use(express.json())

// Global API routes (composed)
app.use('/api', apiRouter)

// Global error handler
app.use(errorMiddleware)

export default app
