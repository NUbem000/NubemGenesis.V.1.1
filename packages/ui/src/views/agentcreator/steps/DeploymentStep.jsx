import React, { useState, useEffect, useRef } from 'react'
import {
    Box,
    Typography,
    Paper,
    Stack,
    CircularProgress,
    LinearProgress,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Alert,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    IconButton,
    Collapse,
    useTheme
} from '@mui/material'
import { 
    IconCheck,
    IconClock,
    IconAlertCircle,
    IconChevronDown,
    IconChevronUp,
    IconServer,
    IconCloud,
    IconShieldCheck,
    IconRocket
} from '@tabler/icons-react'

// Hooks
import { useDeployment } from '../hooks/useDeployment'

const deploymentSteps = [
    {
        label: 'Preparing Configuration',
        description: 'Validating and optimizing agent configuration',
        icon: <IconServer size={20} />
    },
    {
        label: 'Provisioning Resources',
        description: 'Setting up cloud infrastructure and services',
        icon: <IconCloud size={20} />
    },
    {
        label: 'Deploying Agent',
        description: 'Installing and configuring agent components',
        icon: <IconRocket size={20} />
    },
    {
        label: 'Running Health Checks',
        description: 'Verifying agent functionality and performance',
        icon: <IconShieldCheck size={20} />
    }
]

const LogViewer = ({ logs }) => {
    const [expanded, setExpanded] = useState(true)
    const logEndRef = useRef(null)
    const theme = useTheme()

    useEffect(() => {
        if (expanded && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, expanded])

    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                mt: 2,
                overflow: 'hidden',
                transition: 'all 0.3s'
            }}
        >
            <Stack 
                direction="row" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ 
                    p: 1.5,
                    bgcolor: 'action.hover',
                    cursor: 'pointer'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Typography variant="subtitle2">Deployment Logs</Typography>
                <IconButton size="small">
                    {expanded ? <IconChevronUp /> : <IconChevronDown />}
                </IconButton>
            </Stack>
            
            <Collapse in={expanded}>
                <Box
                    sx={{
                        p: 2,
                        maxHeight: 200,
                        overflow: 'auto',
                        bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                    }}
                >
                    {logs.map((log, index) => (
                        <Box 
                            key={index} 
                            sx={{ 
                                mb: 0.5,
                                color: log.type === 'error' ? 'error.main' : 
                                       log.type === 'warning' ? 'warning.main' : 
                                       'text.primary'
                            }}
                        >
                            <span style={{ opacity: 0.6 }}>[{log.timestamp}]</span> {log.message}
                        </Box>
                    ))}
                    <div ref={logEndRef} />
                </Box>
            </Collapse>
        </Paper>
    )
}

const DeploymentStep = ({ configuration, onComplete, loading }) => {
    const { deploy, status, progress, logs, error } = useDeployment()
    const [currentStep, setCurrentStep] = useState(0)
    const [deploymentStarted, setDeploymentStarted] = useState(false)

    useEffect(() => {
        if (!deploymentStarted && configuration) {
            setDeploymentStarted(true)
            startDeployment()
        }
    }, [configuration])

    useEffect(() => {
        // Update current step based on progress
        if (progress >= 100) {
            setCurrentStep(3)
        } else if (progress >= 75) {
            setCurrentStep(3)
        } else if (progress >= 50) {
            setCurrentStep(2)
        } else if (progress >= 25) {
            setCurrentStep(1)
        } else if (progress > 0) {
            setCurrentStep(0)
        }
    }, [progress])

    useEffect(() => {
        if (status === 'completed') {
            // Simulate getting the deployed agent details
            setTimeout(() => {
                onComplete({
                    id: configuration.id,
                    name: configuration.name,
                    endpoint: `https://api.nubemgenesis.com/agents/${configuration.id}`,
                    apiKey: `ng_${Math.random().toString(36).substring(2, 15)}`,
                    status: 'active',
                    createdAt: new Date().toISOString()
                })
            }, 1000)
        }
    }, [status])

    const startDeployment = async () => {
        try {
            await deploy(configuration)
        } catch (err) {
            console.error('Deployment failed:', err)
        }
    }

    const getStatusIcon = (stepIndex) => {
        if (stepIndex < currentStep) return <IconCheck color="green" />
        if (stepIndex === currentStep) return <CircularProgress size={20} />
        return <IconClock opacity={0.5} />
    }

    const getStepStatus = (stepIndex) => {
        if (stepIndex < currentStep) return 'completed'
        if (stepIndex === currentStep) return 'active'
        return 'pending'
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Deploying Your Agent
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Your agent is being deployed to the cloud. This usually takes 2-3 minutes.
                </Typography>
            </Box>

            {/* Progress Overview */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            {status === 'completed' ? 'Deployment Complete!' : 
                             status === 'failed' ? 'Deployment Failed' :
                             'Deployment in Progress...'}
                        </Typography>
                        <Chip 
                            label={`${Math.round(progress)}%`}
                            color={status === 'completed' ? 'success' : 'primary'}
                            size="small"
                        />
                    </Stack>
                    
                    <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ height: 8, borderRadius: 1 }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error.message || 'An error occurred during deployment'}
                        </Alert>
                    )}
                </Stack>
            </Paper>

            {/* Deployment Steps */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Stepper activeStep={currentStep} orientation="vertical">
                    {deploymentSteps.map((step, index) => (
                        <Step key={step.label}>
                            <StepLabel
                                StepIconComponent={() => getStatusIcon(index)}
                                optional={
                                    <Typography variant="caption">
                                        {getStepStatus(index) === 'completed' && 'Completed'}
                                        {getStepStatus(index) === 'active' && 'In progress...'}
                                        {getStepStatus(index) === 'pending' && 'Pending'}
                                    </Typography>
                                }
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    {step.icon}
                                    <Typography>{step.label}</Typography>
                                </Stack>
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary">
                                    {step.description}
                                </Typography>
                                
                                {/* Show relevant logs for active step */}
                                {getStepStatus(index) === 'active' && logs.length > 0 && (
                                    <List dense sx={{ mt: 1 }}>
                                        {logs.slice(-3).map((log, logIndex) => (
                                            <ListItem key={logIndex} sx={{ pl: 0 }}>
                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                    <IconAlertCircle size={16} opacity={0.6} />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={log.message}
                                                    primaryTypographyProps={{
                                                        variant: 'caption',
                                                        color: 'text.secondary'
                                                    }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>

                {/* Detailed Logs */}
                <LogViewer logs={logs} />
            </Box>

            {/* Status Messages */}
            {status === 'completed' && (
                <Alert severity="success" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                        <strong>Success!</strong> Your agent has been deployed successfully and is ready to use.
                    </Typography>
                </Alert>
            )}
        </Box>
    )
}

export default DeploymentStep