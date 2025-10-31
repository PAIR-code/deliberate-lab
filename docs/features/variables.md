# Experiment Variables Design Document

## Overview

Experiment Variables enable researchers to create different experimental conditions by defining values that vary across cohorts. This allows for A/B testing, multi-arm experiments, and conditional content presentation while maintaining a single experiment configuration.

## Core Concepts

### Variables
Variables are named values that can be referenced in stage configurations using template syntax (`{{variableName}}`). They can be:
- **Primitives**: strings, numbers, booleans
- **Objects**: structured data with multiple properties (e.g., `{{policy.name}}`, `{{policy.cost}}`)

### Variable Cohorts
Cohorts created through the variables system that each receive different variable values. Participants in different cohorts see different content based on their cohort's variable assignments.

### Template Resolution
Stage content containing `{{variableName}}` placeholders gets resolved to actual values based on the participant's cohort variables.

## Architecture

### Data Structure

```typescript
interface ExperimentVariables {
  // Define available variables and their types
  definitions: {
    [variableName: string]: {
      type: 'string' | 'number' | 'boolean' | 'object';
      description?: string;
      defaultValue?: any;
      // For object types, define property structure
      schema?: {
        [property: string]: {
          type: 'string' | 'number' | 'boolean';
          description?: string;
        }
      };
    }
  };
  
  // Define cohorts and their variable values
  cohorts: {
    [cohortName: string]: {
      description?: string;
      isInitialCohort?: boolean; // Mark as initial cohort (max 1 per experiment)
      variables: {
        [variableName: string]: any;
      };
      cohortId?: string; // Set when cohort is created
    }
  };

  // Assignment strategy for distributing participants
  assignment: {
    method: 'distribution' | 'manual';

    // For probability distribution assignment
    distribution?: {
      seedStrategy: SeedStrategy;
      customSeed?: string;
      // Optional probabilities per cohort (0.0-1.0, defaults to equal distribution)
      // Uses cumulative probability distribution for assignment
      probabilities?: {
        [cohortName: string]: number;
      };
    };
  };
}
```

## Key Design Decisions

### 1. Variables Define Cohorts
**Decision**: Variable configuration includes cohort definitions. Cohorts are created from the variable configuration.

**Rationale**: 
- Avoids the ID mapping problem (cohort IDs are auto-generated)
- Single source of truth for experimental conditions
- Clear mental model: define conditions and their values together

**Alternative Considered**: Mapping variables to existing cohorts by ID or index
- **Problem**: Cohort IDs aren't known until creation, indices change with cohort order

### 2. Leverage Transfer Stage for Assignment
**Decision**: Use the existing transfer stage mechanism for cohort assignment rather than building new assignment infrastructure.

**Rationale**:
- Transfer stage already handles participant distribution logic
- Supports waiting for participant thresholds
- Has timeout mechanisms
- Reduces code duplication

**Implementation**: The "Initialize Variable Cohorts" action will:
1. Create cohorts based on variable configuration
2. Configure a transfer stage with appropriate assignment logic

### 3. Assignment Strategy at Variables Level
**Decision**: Define assignment strategy (distribution, manual) at the variables level, not per-cohort.

**Rationale**:
- Avoids confusing "probability of remaining" calculations
- Single source of truth for assignment logic
- Clearer mental model for experimenters

**Example Problem We Avoided**:
```typescript
// Confusing: Each cohort defines probability of "remaining" participants
cohortA: { probability: 0.333 }  // 33.3% of all
cohortB: { probability: 0.5 }    // 50% of remaining = 33.3% of all
cohortC: { /* gets remainder */ } // 33.3% of all
```

**Our Solution**:
```typescript
// Clear: Define probabilities at assignment level (uses same logic as RandomCondition)
assignment: {
  method: 'distribution',
  distribution: {
    seedStrategy: SeedStrategy.PARTICIPANT,
    probabilities: {
      'cohortA': 0.33,  // 33% probability
      'cohortB': 0.33,  // 33% probability
      'cohortC': 0.34   // 34% probability (totals 1.0)
    }
    // Or omit probabilities for equal distribution across all cohorts
  }
}
```

### 4. Deterministic Probability Distribution
**Decision**: Use seeded randomization with SeedStrategy (PARTICIPANT, EXPERIMENT, CUSTOM, COHORT) matching `RandomCondition` implementation.

**Rationale**:
- Reproducible assignments (same participant always gets same cohort)
- Supports testing and debugging
- Consistent with existing `RandomCondition` logic in condition system
- Uses cumulative probability distribution for assignment
- Leverages existing random utilities (`seed()` and `random()`) with identical approach
- Clear distinction from `RandomCondition` (which is for binary decisions)

### 5. Template Syntax Choice
**Decision**: Use double-brace syntax `{{variableName}}` for template variables.

**Rationale**:
- Not currently used in the codebase (verified via grep)
- Familiar from templating systems (Handlebars, etc.)
- Visually distinct from other syntax
- Supports nested access: `{{object.property}}`

### 6. Optional Initial Cohort Pattern
**Decision**: Support an optional initial cohort where all participants start before treatment assignment.

**Rationale**:
- Simple experiments can use direct assignment
- Complex experiments can use an initial cohort for pre-treatment stages
- Clearer mental model with single entry point

**Patterns Supported**:
1. **Direct Assignment**: Participants immediately assigned to treatment cohorts on join
2. **Initial Cohort Pattern**: All participants start in initial cohort, then transfer to treatment cohorts
3. **Pre-Assignment Stages**: Complete consent/survey in initial cohort before assignment

**Implementation**: 
- Exactly one cohort can be marked with `isInitialCohort: true`
- Initial cohort is automatically excluded from random assignment
- Variables in initial cohort typically empty or use default values
- Templates before transfer stage show default values
- Validation ensures maximum one initial cohort per experiment

## Implementation Status

### Phase 1: Core Infrastructure ✅ COMPLETED
- [x] Variable types and interfaces in utils package
- [x] Template resolution utilities using Mustache
- [x] Support for string, number, boolean, and object variables

### Phase 2: Cohort Management ✅ COMPLETED
- [x] Initialize Variable Cohorts endpoint
- [x] Integration with transfer stage (VariableAutoTransferConfig)
- [x] Distribution assignment strategy implementation
- [x] Seeded randomization for reproducible assignments
- [x] Helper function for participant cohort transfers

### Phase 3: UI Components ⏳ TODO
- [ ] Variable editor in experiment builder
- [ ] Cohort configuration interface
- [ ] Template validation and preview

### Phase 4: Stage Integration 🚧 IN PROGRESS
- [x] Variable resolution in InfoStage
- [ ] Extend to Survey, Chat, and other text-containing stages
- [ ] Template preview in stage editors

### Phase 5: Advanced Features 🚧 IN PROGRESS
- [x] Object variable support with nested properties
- [ ] Conditional assignment rules (deferred for simplicity)
- [ ] Variable usage analytics

## Usage Examples

### Simple A/B Test with Initial Cohort
```typescript
{
  definitions: {
    buttonColor: { type: 'string', defaultValue: 'gray' },
    buttonText: { type: 'string', defaultValue: 'Next' }
  },
  
  cohorts: {
    'Onboarding': {
      description: 'Initial cohort for consent and demographics',
      isInitialCohort: true, // Marked as the initial cohort
      variables: {} // Uses default values
    },
    'Control': {
      variables: {
        buttonColor: 'blue',
        buttonText: 'Submit'
      }
    },
    'Treatment': {
      variables: {
        buttonColor: 'green',
        buttonText: 'Continue'
      }
    }
  },
  
  assignment: {
    method: 'distribution',
    distribution: {
      seedStrategy: SeedStrategy.PARTICIPANT
      // Initial cohort automatically excluded from assignment
    }
  }
}
```

### Multi-Arm Policy Experiment
```typescript
{
  definitions: {
    policy: {
      type: 'object',
      schema: {
        name: { type: 'string' },
        description: { type: 'string' },
        cost: { type: 'number' },
        coverage: { type: 'string' }
      }
    }
  },
  
  cohorts: {
    'Universal Healthcare': {
      variables: {
        policy: {
          name: 'Medicare for All',
          description: 'Government-run single-payer system',
          cost: 3200000000000,
          coverage: '100% of population'
        }
      }
    },
    'Public Option': {
      variables: {
        policy: {
          name: 'Public Option',
          description: 'Government insurance competing with private',
          cost: 1500000000000,
          coverage: '95% of population'
        }
      }
    },
    'Status Quo': {
      variables: {
        policy: {
          name: 'Current System',
          description: 'Employer-based with marketplace',
          cost: 3800000000000,
          coverage: '91% of population'
        }
      }
    }
  },
  
  assignment: {
    method: 'distribution',
    distribution: {
      seedStrategy: SeedStrategy.PARTICIPANT,
      // Probabilities optional - defaults to equal distribution across all cohorts
      probabilities: {
        'Universal Healthcare': 0.33,
        'Public Option': 0.33,
        'Status Quo': 0.34
      }
    }
  }
}
```

### Template Usage in Stages

**InfoStage Content:**
```markdown
## {{policy.name}}

{{policy.description}}

**Estimated Annual Cost**: ${{policy.cost}}
**Population Coverage**: {{policy.coverage}}

Please review this policy carefully before proceeding to the discussion.
```

**Survey Question:**
```
How strongly do you support {{policy.name}}?
```

**Chat System Prompt:**
```
Participants will discuss {{policy.name}}, which costs ${{policy.cost}} 
annually and covers {{policy.coverage}}.
```

## Migration and Compatibility

### Existing Experiments
- Variables are opt-in; existing experiments continue working unchanged
- Can gradually adopt variables by adding configuration and recreating cohorts

### Participant Flow with Variables
1. **Join Experiment**: Participant clicks link, joins cohort marked with `isInitialCohort: true`
2. **Pre-Assignment Stages**: Complete consent, demographics, etc. in initial cohort
   - Templates show default values or placeholders
   - Variables not yet resolved to treatment values
3. **Transfer Stage**: Participant assigned to treatment cohort
   - Assignment based on method (distribution/manual)
   - Initial cohort excluded from assignment pool
4. **Post-Assignment Stages**: See treatment-specific content
   - Templates now resolve to cohort-specific variables
   - Full variable values available

### Automatic Cohort Transfer Service
- Compatible with variable cohorts
- Transfer stage handles assignment based on variable configuration
- Service can distribute participants according to assignment strategy

### Manual Cohort Management
- Experimenters can still manually create and manage cohorts
- Variable cohorts marked with metadata for identification
- Can mix variable and non-variable cohorts in same experiment

## Security and Validation

### Template Injection Prevention
- Templates resolved server-side only
- No client-side template evaluation
- Variable values sanitized before insertion

### Type Validation
- Variable definitions enforce type constraints
- Schema validation for object variables
- Runtime type checking during template resolution

### Configuration Validation
- Maximum one cohort with `isInitialCohort: true`
- At least one non-initial cohort required for assignment
- Variable names must be valid identifiers

### Access Control
- Variables resolved based on participant's cohort
- Participants cannot access other cohorts' variables
- Experimenter-only access to variable configuration

## Future Enhancements

### Dynamic Variables
- Computed variables (e.g., `{{participantCount}}`)
- Time-based variables (e.g., `{{experimentDay}}`)
- Aggregate variables from participant responses

### Advanced Assignment

#### Conditional Assignment (Future)
Conditional assignment would allow cohort assignment based on participant data (e.g., survey responses). This was deferred from the initial implementation to keep things simple.

**Proposed Design**:
```typescript
assignment: {
  method: 'conditional',
  conditional: {
    conditions: {
      'Senior': createComparisonCondition(
        {stageId: 'survey', questionId: 'age'},
        'greater_than_or_equal',
        65
      ),
      'Adult': createComparisonCondition(
        {stageId: 'survey', questionId: 'age'},
        'greater_than_or_equal',
        18
      ),
    },
    defaultCohort: 'Child'
  }
}
```

**Implementation Challenges**:
- **Context Passing**: Need to pass participant answers and stage data to evaluation context
  - Must fetch stage answers for dependencies extracted from conditions
  - Need to build `targetValues` mapping from participant's stage answers
  - Requires access to `experimentId`, `cohortId`, `participantId` for RandomCondition seeds
- **Mutually Exclusive Conditions**: Conditions should be mutually exclusive to avoid ambiguity
  - If multiple conditions match, behavior is undefined
  - Validation tooling needed to detect overlapping conditions
  - Consider runtime warnings if multiple conditions evaluate to true
- **Data Availability**: Transfer must occur after all dependency stages are completed
  - Conditions reference specific stage/question answers
  - Must ensure those stages have been completed before transfer
  - Complex dependency tracking may be needed

**Alternative Approach**: Use survey-based transfer (existing `AutoTransferType.SURVEY`) which already handles condition evaluation with proper context.

#### Other Advanced Assignment Features
- Multi-factor assignment (combine multiple strategies)
- Sequential assignment patterns
- Adaptive assignment based on cohort balance

### Variable Analytics
- Track which variables are actually used
- Analyze variable impact on outcomes
- A/B test result calculation

## Conclusion

The Experiment Variables system provides a powerful, flexible way to create experimental conditions while maintaining clean separation between experimental design (what varies) and operational concerns (how to run the experiment). By leveraging existing infrastructure (transfer stages, conditions) and making thoughtful design decisions (variables define cohorts, assignment at variables level), we create a system that is both powerful and intuitive for researchers.