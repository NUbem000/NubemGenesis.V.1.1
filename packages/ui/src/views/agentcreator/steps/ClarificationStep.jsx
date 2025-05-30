import React, { useState } from 'react'
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    Alert,
    AlertTitle,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Checkbox,
    FormGroup,
    Chip,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Divider
} from '@mui/material'
import { 
    IconArrowLeft, 
    IconSparkles,
    IconChevronDown,
    IconInfoCircle,
    IconRocket
} from '@tabler/icons-react'

const QuestionCard = ({ question, value, onChange }) => {
    const isMultiSelect = question.type === 'multiSelect'
    const isTextInput = question.type === 'text'

    return (
        <Paper variant="outlined" sx={{ p: 3 }}>
            <FormControl component="fieldset" fullWidth>
                <FormLabel 
                    component="legend" 
                    sx={{ 
                        mb: 2,
                        fontSize: '1.1rem',
                        fontWeight: 500,
                        color: 'text.primary'
                    }}
                >
                    {question.question}
                    {question.required && <span style={{ color: 'error.main' }}> *</span>}
                </FormLabel>

                {question.hint && (
                    <Alert severity="info" icon={<IconInfoCircle size={20} />} sx={{ mb: 2 }}>
                        {question.hint}
                    </Alert>
                )}

                {isTextInput ? (
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={question.placeholder}
                        variant="outlined"
                    />
                ) : isMultiSelect ? (
                    <FormGroup>
                        {question.options.map((option) => (
                            <FormControlLabel
                                key={option.value}
                                control={
                                    <Checkbox
                                        checked={(value || []).includes(option.value)}
                                        onChange={(e) => {
                                            const current = value || []
                                            if (e.target.checked) {
                                                onChange([...current, option.value])
                                            } else {
                                                onChange(current.filter(v => v !== option.value))
                                            }
                                        }}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span>{option.label}</span>
                                        {option.popular && (
                                            <Chip 
                                                label="Popular" 
                                                size="small" 
                                                color="primary"
                                            />
                                        )}
                                        {option.recommended && (
                                            <Chip 
                                                label="Recommended" 
                                                size="small" 
                                                color="success"
                                            />
                                        )}
                                    </Box>
                                }
                                sx={{ mb: 1 }}
                            />
                        ))}
                    </FormGroup>
                ) : (
                    <RadioGroup
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        {question.options.map((option) => (
                            <FormControlLabel
                                key={option.value}
                                value={option.value}
                                control={<Radio />}
                                label={
                                    <Box>
                                        <Typography variant="body1">
                                            {option.label}
                                        </Typography>
                                        {option.description && (
                                            <Typography variant="caption" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                        )}
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                            {option.popular && (
                                                <Chip 
                                                    label="Popular" 
                                                    size="small" 
                                                    color="primary"
                                                />
                                            )}
                                            {option.recommended && (
                                                <Chip 
                                                    label="Recommended" 
                                                    size="small" 
                                                    color="success"
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                }
                                sx={{ mb: 2 }}
                            />
                        ))}
                    </RadioGroup>
                )}
            </FormControl>
        </Paper>
    )
}

const ClarificationStep = ({ questions = [], initialDescription, onSubmit, onBack, loading }) => {
    const [answers, setAnswers] = useState({})
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }))
    }

    const isComplete = () => {
        // Check if all required questions are answered
        return questions
            .filter(q => q.required)
            .every(q => {
                const answer = answers[q.id]
                if (q.type === 'multiSelect') {
                    return answer && answer.length > 0
                } else {
                    return answer && answer.trim() !== ''
                }
            })
    }

    const handleSubmit = () => {
        if (isComplete() && !loading) {
            onSubmit(answers)
        }
    }

    // Group questions by category
    const groupedQuestions = questions.reduce((acc, question) => {
        const category = question.category || 'General'
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(question)
        return acc
    }, {})

    const mainQuestions = groupedQuestions['General'] || []
    const advancedCategories = Object.entries(groupedQuestions).filter(([cat]) => cat !== 'General')

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconSparkles size={24} />
                    Let's clarify a few things
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    I need some additional information to create the perfect agent for you.
                </Typography>
            </Box>

            {/* Context reminder */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Your request</AlertTitle>
                <Typography variant="body2">
                    "{initialDescription}"
                </Typography>
            </Alert>

            {/* Questions */}
            <Box sx={{ flex: 1, overflow: 'auto', mb: 3 }}>
                <Stack spacing={3}>
                    {/* Main questions */}
                    {mainQuestions.map((question) => (
                        <QuestionCard
                            key={question.id}
                            question={question}
                            value={answers[question.id]}
                            onChange={(value) => handleAnswerChange(question.id, value)}
                        />
                    ))}

                    {/* Advanced options */}
                    {advancedCategories.length > 0 && (
                        <Accordion 
                            expanded={showAdvanced}
                            onChange={(e, expanded) => setShowAdvanced(expanded)}
                        >
                            <AccordionSummary 
                                expandIcon={<IconChevronDown />}
                                sx={{ bgcolor: 'action.hover' }}
                            >
                                <Typography>Advanced Options</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={3}>
                                    {advancedCategories.map(([category, categoryQuestions]) => (
                                        <Box key={category}>
                                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                                {category}
                                            </Typography>
                                            <Stack spacing={2}>
                                                {categoryQuestions.map((question) => (
                                                    <QuestionCard
                                                        key={question.id}
                                                        question={question}
                                                        value={answers[question.id]}
                                                        onChange={(value) => handleAnswerChange(question.id, value)}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    )}
                </Stack>
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={2}>
                <Button
                    variant="outlined"
                    startIcon={<IconArrowLeft />}
                    onClick={onBack}
                    disabled={loading}
                >
                    Back
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={!isComplete() || loading}
                    endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconRocket />}
                >
                    {loading ? 'Generating your agent...' : 'Generate Agent'}
                </Button>
            </Stack>

            {!isComplete() && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Please answer all required questions to continue
                </Typography>
            )}
        </Box>
    )
}

export default ClarificationStep