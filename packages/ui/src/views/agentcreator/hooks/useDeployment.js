import { useState, useEffect, useRef } from 'react'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { baseURL } from '@/store/constant'

export const useDeployment = () => {
    const [status, setStatus] = useState('idle') // idle, deploying, completed, failed
    const [progress, setProgress] = useState(0)
    const [logs, setLogs] = useState([])
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)
    const abortControllerRef = useRef(null)

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        setLogs(prev => [...prev, { timestamp, message, type }])
    }

    const simulateDeployment = async (configuration) => {
        const steps = [
            { progress: 10, message: 'Validating configuration...', delay: 500 },
            { progress: 15, message: 'Configuration validated successfully', delay: 800 },
            { progress: 20, message: 'Allocating cloud resources...', delay: 1000 },
            { progress: 30, message: 'Creating virtual environment...', delay: 1200 },
            { progress: 35, message: 'Installing base dependencies...', delay: 800 },
            { progress: 40, message: 'Configuring AI model: ' + configuration.model, delay: 1000 },
            { progress: 50, message: 'Setting up API endpoints...', delay: 1000 },
            { progress: 55, message: 'Configuring authentication...', delay: 600 },
            { progress: 60, message: 'Enabling security features...', delay: 800 },
            { progress: 70, message: 'Deploying agent components...', delay: 1200 },
            { progress: 75, message: 'Starting health checks...', delay: 500 },
            { progress: 80, message: 'Running integration tests...', delay: 1000 },
            { progress: 85, message: 'Verifying API connectivity...', delay: 800 },
            { progress: 90, message: 'Finalizing deployment...', delay: 1000 },
            { progress: 95, message: 'Generating API credentials...', delay: 500 },
            { progress: 100, message: 'Deployment completed successfully!', delay: 500 }
        ]

        for (const step of steps) {
            if (abortControllerRef.current?.signal.aborted) {
                throw new Error('Deployment cancelled')
            }

            await new Promise(resolve => setTimeout(resolve, step.delay))
            setProgress(step.progress)
            addLog(step.message)

            // Simulate occasional warnings
            if (Math.random() > 0.8) {
                addLog('Notice: Using default configuration for some parameters', 'warning')
            }
        }

        return {
            id: configuration.id,
            status: 'active',
            endpoint: `https://api.nubemgenesis.com/agents/${configuration.id}`,
            apiKey: `ng_${Math.random().toString(36).substring(2, 15)}`
        }
    }

    const deploy = async (configuration) => {
        setStatus('deploying')
        setProgress(0)
        setLogs([])
        setError(null)
        setResult(null)

        abortControllerRef.current = new AbortController()

        try {
            // Check if real endpoint exists
            const useRealEndpoint = false // Set to true when backend is ready

            if (useRealEndpoint) {
                // Real deployment using EventSource
                await fetchEventSource(`${baseURL}/api/v2/orchestrate/deploy/${configuration.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': EventStreamContentType
                    },
                    body: JSON.stringify(configuration),
                    signal: abortControllerRef.current.signal,
                    onopen: async (response) => {
                        if (response.ok) {
                            addLog('Connected to deployment service')
                        } else {
                            throw new Error(`Failed to connect: ${response.status}`)
                        }
                    },
                    onmessage: (event) => {
                        try {
                            const data = JSON.parse(event.data)
                            
                            if (data.progress !== undefined) {
                                setProgress(data.progress)
                            }
                            
                            if (data.log) {
                                addLog(data.log, data.logType)
                            }
                            
                            if (data.status === 'completed') {
                                setStatus('completed')
                                setResult(data.result)
                            } else if (data.status === 'failed') {
                                throw new Error(data.error || 'Deployment failed')
                            }
                        } catch (err) {
                            console.error('Failed to parse event data:', err)
                        }
                    },
                    onerror: (err) => {
                        console.error('EventSource error:', err)
                        throw err
                    }
                })
            } else {
                // Simulated deployment for development
                addLog('Starting deployment simulation...')
                const deploymentResult = await simulateDeployment(configuration)
                setResult(deploymentResult)
                setStatus('completed')
            }
        } catch (err) {
            console.error('Deployment error:', err)
            setError(err)
            setStatus('failed')
            addLog(`Deployment failed: ${err.message}`, 'error')
        }
    }

    const cancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            setStatus('cancelled')
            addLog('Deployment cancelled by user', 'warning')
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    return {
        deploy,
        cancel,
        status,
        progress,
        logs,
        error,
        result
    }
}