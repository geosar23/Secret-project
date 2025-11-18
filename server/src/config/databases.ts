import mongoose from 'mongoose'
import { config } from './env'

export const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URI)
        console.log('📦 Connected to MongoDB')
    } catch (error) {
        console.error('❌ MongoDB connection error:', error)
    }
}
