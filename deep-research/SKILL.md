---
name: deep-research
description: Comprehensive research workflow for creating well-researched articles. This skill should be used when the user wants to research a topic thoroughly and produce a detailed article with multiple drafts, reviews, and translations. Best for complex topics requiring systematic information gathering, analysis, and iterative refinement.
---

# Deep Research

This skill provides a systematic workflow for conducting comprehensive research through coordinated sub-agent delegation.

## Core Architecture

The Lead Agent (you) acts as a research coordinator, delegating research tasks to WebAgent sub-agents while focusing on:
- Research planning and query decomposition
- Sub-agent task allocation and coordination
- Result synthesis and quality control
- Final report composition

WebAgent sub-agents handle the actual web research:
- Searching and fetching web content
- Following links and gathering information
- Returning structured findings

## Phase 1: Research Planning and Query Analysis

### 1.0 Preliminary Context Gathering (Conditional)

**Trigger Conditions** - Execute this step when:
- Topic involves recent events (after model knowledge cutoff)
- Lead Agent lacks sufficient background knowledge
- User-provided terms or entities are unfamiliar
- Topic appears highly specialized or niche

**Execution:**
Deploy a single WebAgent for quick overview search:

```
Quick overview search for [topic keywords].

OBJECTIVE: Gather baseline context for research planning, NOT deep research.

IDENTIFY:
1. What is the core event/issue
2. Key participants/entities involved
3. Critical timeline and dates
4. Main points of contention or perspectives
5. Related topics or background needed

CONSTRAINTS:
- Overview-level information only
- Limit to 3-5 authoritative sources
- Focus on establishing basic facts, not analysis

Return a brief summary (200-300 words) covering these elements.
```

**Output:** Use overview findings to inform subsequent planning steps. Skip this step if Lead Agent has sufficient knowledge of the topic.

### 1.1 Topic Assessment

Analyze the user's research request (incorporating preliminary context if gathered):
- Identify main concepts, key entities, and relationships
- List specific facts or data points needed
- Note temporal or contextual constraints
- Determine expected output format (detailed report, comparison, analysis, etc.)

### 1.2 Query Type Determination

Classify the query to determine delegation strategy:

**Depth-First Query**: Multiple perspectives on a single issue
- Deploy parallel agents exploring different viewpoints or methodologies
- Example: "What causes climate change denial?" - agents explore psychological, political, economic, and social perspectives

**Breadth-First Query**: Distinct, independent sub-questions
- Deploy agents handling separate sub-topics independently
- Example: "Compare EU country economic policies" - agents research different regions in parallel

**Straightforward Query**: Focused, well-defined question
- Deploy 1-2 agents for efficient fact-finding
- Example: "What is the current status of X project?"

### 1.3 Research Plan Development

Create a structured research plan:

```markdown
# Research Plan: [Topic]

## Query Type: [Depth-First / Breadth-First / Straightforward]

## Research Objectives
- Primary question: [main question to answer]
- Secondary questions: [supporting questions]

## Sub-Agent Tasks
| Agent # | Research Focus | Key Questions | Expected Output |
|---------|---------------|---------------|-----------------|
| 1 | [focus area] | [questions] | [output type] |
| 2 | [focus area] | [questions] | [output type] |
| ... | ... | ... | ... |

## Source Strategy
- Prioritized sources: [types of sources to use]
- Sources to avoid: [unreliable sources]
```

**Output:** Write to `{topic}-1-research-plan.md`

## Phase 2: Coordinated Information Gathering

### 2.1 Sub-Agent Deployment Framework

Use WebAgent tool to delegate research tasks. Each sub-agent call MUST include:

1. **Clear Research Objective** - Single, focused goal
2. **output_format** - JSON Schema for structured return data
3. **Source Guidance** - What sources to prioritize/avoid
4. **Scope Boundaries** - What NOT to research (prevent overlap)

### 2.2 Sub-Agent Task Template

For each WebAgent sub-agent, use this prompt structure:

```
Research [specific topic/aspect].

OBJECTIVE: [single clear goal]

KEY QUESTIONS TO ANSWER:
1. [specific question]
2. [specific question]
3. [specific question]

SOURCE PRIORITIES:
- Prefer: [authoritative sources - official docs, academic papers, established news]
- Avoid: [unreliable sources - forums, social media rumors, outdated info]

SCOPE BOUNDARIES:
- Focus on: [specific scope]
- Do NOT research: [other agents' territories]
- Time range: [if applicable]

OUTPUT REQUIREMENTS:
Provide findings as structured data. For EACH fact, you MUST include:
- The fact/finding itself
- COMPLETE source URL (https://...) - NOT just the domain or publication name
- Publication date if available
- Confidence level (high/medium/low)

CRITICAL: Every fact must have a full, clickable URL. Facts without URLs will be discarded.
```

### 2.3 Sub-Agent Count Guidelines

| Query Complexity | Agent Count | Example |
|-----------------|-------------|---------|
| Straightforward | 1-2 | Simple fact-finding, single source needed |
| Standard | 2-3 | Multiple perspectives on focused topic |
| Medium | 3-5 | Multi-faceted questions, different methodologies |
| High | 5-10 | Broad multi-part queries with distinct components |

**CRITICAL**: Never exceed 10 sub-agents. Restructure approach if more seem needed.

### 2.4 output_format Schema Examples

**For fact-finding tasks:**
```json
{
  "type": "object",
  "properties": {
    "key_findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "fact": {"type": "string", "description": "The factual finding"},
          "source_url": {"type": "string", "description": "FULL URL starting with https://"},
          "source_title": {"type": "string", "description": "Article or document title"},
          "source_date": {"type": "string", "description": "Publication date YYYY-MM-DD"},
          "confidence": {"enum": ["high", "medium", "low"]}
        },
        "required": ["fact", "source_url"]
      }
    },
    "summary": {"type": "string"},
    "gaps_identified": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["key_findings", "summary"]
}
```

**For comparative research:**
```json
{
  "type": "object",
  "properties": {
    "entity_name": {"type": "string"},
    "attributes": {"type": "object"},
    "pros": {"type": "array", "items": {"type": "string"}},
    "cons": {"type": "array", "items": {"type": "string"}},
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "url": {"type": "string", "description": "FULL URL starting with https://"},
          "date": {"type": "string"}
        },
        "required": ["url"]
      }
    }
  }
}
```

### 2.5 Parallel Execution Strategy

**For Depth-First queries:**
Launch all perspective-based agents simultaneously:
```
// Example: 3 parallel WebAgent calls for "AI impact on healthcare"
Agent 1: Clinical and patient care perspective
Agent 2: Regulatory and ethical perspective  
Agent 3: Economic and industry perspective
```

**For Breadth-First queries:**
Launch independent topic agents in parallel:
```
// Example: 4 parallel WebAgent calls for "Compare cloud providers"
Agent 1: AWS capabilities and pricing
Agent 2: Azure capabilities and pricing
Agent 3: GCP capabilities and pricing
Agent 4: Industry adoption and market trends
```

### 2.6 Result Synthesis

After sub-agents return:
1. **Cross-validate** - Check for conflicting information between agents
2. **Identify gaps** - Note missing information that needs follow-up
3. **Prioritize by confidence** - Weight high-confidence findings
4. **Resolve conflicts** - Use recency, source authority, and consistency
5. **Compile source registry** - Create a master list of all sources with URLs

**Source Registry Format:**
Maintain a consolidated list of all sources gathered:
```
| # | Title | URL | Date | Used For |
|---|-------|-----|------|----------|
| 1 | [title] | https://... | YYYY-MM-DD | [which finding] |
| 2 | [title] | https://... | YYYY-MM-DD | [which finding] |
```

This registry will be used for the References section in the final article.

**Decision: Additional Research Round?**
- If critical gaps exist: Deploy targeted follow-up agents (max 2-3)
- If sufficient coverage: Proceed to Phase 3
- STOP research when diminishing returns reached

## Phase 3: Outline Refinement

Synthesize all sub-agent findings into a structured outline:

1. **Organize by theme** - Group related findings from different agents
2. **Create narrative flow** - Logical progression through the topic
3. **Map sources to sections** - Which findings support each part
4. **Balance perspectives** - Ensure fair coverage of viewpoints

**Output:** Write to `{topic}-2-outline.md`

## Phase 4: First Draft Creation

Write the complete article based on outline and synthesized research:

1. **Integrate findings naturally** - Weave sub-agent discoveries into narrative
2. **Inline citations** - Use numbered references [1], [2], etc. when citing specific facts
3. **Maintain objectivity** - Present multiple viewpoints fairly
4. **Target length** - 1500-3000 words for comprehensive topics
5. **References section** - Include a numbered reference list at the end with full URLs

**Citation Format (GFM Footnotes):**

Use GitHub Flavored Markdown footnote syntax for inline citations. This enables clickable references that render as superscript numbers.

```markdown
According to a recent analysis[^1], the policy affects multiple sectors[^2]...

[^1]: [Article Title](https://full-url.com/path) - Source Name, YYYY-MM-DD
[^2]: [Article Title](https://full-url.com/path) - Source Name, YYYY-MM-DD
```

**Syntax Rules:**
- Inline: `[^n]` immediately after the cited text (no space before)
- Definition: `[^n]:` followed by the source details
- Footnote definitions can be placed anywhere but conventionally go at the end
- Renderers (GitHub, Obsidian, etc.) will auto-number and create bidirectional links

**CRITICAL:** Every factual claim must be traceable to a source URL from sub-agent findings. Do not use sources without URLs.

**Output:** Write to `{topic}-3-first-draft.md`

## Phase 5: Critical Review and Improvement

Conduct a systematic self-review of the draft:

**Review Criteria:**
1. Factual accuracy - verify claims against sub-agent findings
2. Balance of perspectives - ensure fair coverage of viewpoints
3. Logical structure and flow - check narrative progression
4. Writing quality and clarity - improve readability
5. Citation completeness - verify all facts have sources

**For each improvement:**
- **Original**: [excerpt from draft]
- **Improved**: [revised content]
- **Rationale**: [why this works better]

**Output:** Write improvements to `{topic}-4-improvements.md`

## Phase 6: Final Article Assembly

Integrate all improvements into polished final version:

1. Incorporate all accepted changes
2. Verify consistency in terminology and tone
3. Final fact-check against sub-agent findings
4. Polish transitions and flow
5. **Verify all citations have URLs** - Ensure References section contains clickable links

**Final References Format (GFM Footnotes):**
```markdown
[^1]: [Full Article Title](https://example.com/full/path/to/article) - Publication Name, YYYY-MM-DD
[^2]: [Full Article Title](https://example.com/another/article) - Publication Name, YYYY-MM-DD
```

**Quality Check:** Before finalizing, verify:
- [ ] All inline citations `[^n]` have corresponding footnote definitions
- [ ] All footnote definitions contain valid, complete URLs
- [ ] No sources cited without URLs

**Output:** Write to `{topic}-5-final.md`

## Phase 7: Translation (Optional)

Create Chinese version if requested:
- Translate final polished version
- Adapt cultural references appropriately
- Maintain structure and meaning

**Output:** Write to `{topic}-6-chinese.md`

## Coordination Best Practices

### Preventing Agent Overlap
- Define EXPLICIT scope boundaries in each agent prompt
- Use "Do NOT research X" instructions
- Assign distinct geographic regions, time periods, or perspectives

### Maximizing Agent Efficiency
- Front-load the most critical research tasks
- Deploy blocking tasks first (tasks others depend on)
- Use parallel execution for independent tasks
- Limit each agent to ONE clear objective

### Quality Control
- Always specify output_format for structured data
- Request confidence levels with findings
- Ask agents to note conflicting information
- Track sources for verification

### Resource Management
- Start with minimum viable agent count
- Add agents only when gaps identified
- Stop when coverage is sufficient - avoid over-researching
- Synthesize and write when diminishing returns reached

## Example: Complete Research Session

### Example A: Familiar Topic (No Preliminary Search Needed)

**User request:** "Research the current state of quantum computing and its business applications"

**Phase 1.0:** Skipped - Lead Agent has sufficient background knowledge

**Phase 1 - Planning:**
- Query type: Breadth-First (distinct sub-topics)
- Agents needed: 4

**Phase 2 - Deployment:**
```
Agent 1: "Research current quantum computing technology capabilities.
         Focus: hardware advances, qubit counts, error rates, major players.
         Do NOT research business applications."

Agent 2: "Research quantum computing business applications.
         Focus: use cases, companies implementing, ROI examples.
         Do NOT research underlying technology."

Agent 3: "Research quantum computing market and investment landscape.
         Focus: funding, valuations, market projections, key investors.
         Do NOT research technology or specific applications."

Agent 4: "Research challenges and timeline for quantum advantage.
         Focus: technical barriers, expert predictions, roadmaps.
         Do NOT research current applications or market."
```

**Synthesis:** Combine findings, resolve conflicts, identify gaps

**Phases 3-6:** Outline, draft, review and improve, finalize

### Example B: Unfamiliar Topic (Preliminary Search Required)

**User request:** "Research the 2025 Cambodia-Thailand border conflict"

**Phase 1.0 - Preliminary Context:**
Lead Agent has no knowledge of this event. Deploy WebAgent for overview:
```
Quick overview: 2025 Cambodia Thailand border conflict

Identify: core issue, key parties, timeline, main disputes
```

**WebAgent returns:**
- Border dispute escalated Dec 2025 over Preah Vihear temple area
- Key parties: Hun Manet government, Thai military, ASEAN mediators
- Timeline: Tensions since Nov, military buildup Dec 8, clashes Dec 12
- Disputes: Historical territorial claims, nationalist politics, resource access

**Phase 1 - Planning (Informed by Context):**
- Query type: Depth-First (multiple perspectives on single conflict)
- Agents needed: 4

**Phase 2 - Deployment:**
```
Agent 1: "Research historical background of Cambodia-Thailand border disputes.
         Focus: Preah Vihear temple history, ICJ rulings, previous conflicts.
         Do NOT research current 2025 events."

Agent 2: "Research current military situation in Dec 2025 Cambodia-Thailand conflict.
         Focus: troop movements, clashes, casualties, military statements.
         Do NOT research historical background or diplomatic efforts."

Agent 3: "Research diplomatic responses to 2025 Cambodia-Thailand conflict.
         Focus: ASEAN role, international reactions, negotiation attempts.
         Do NOT research military details or historical context."

Agent 4: "Research domestic political factors in both countries.
         Focus: nationalist movements, election pressures, public opinion.
         Do NOT research military or diplomatic aspects."
```

## Notes

- This workflow is for substantial research projects; adapt for simpler queries
- The Lead Agent NEVER conducts primary web research - always delegate to WebAgent
- All artifacts go to separate files for user reference
- Lead Agent handles quality review, synthesis and writing
