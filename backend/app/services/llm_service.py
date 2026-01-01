import json
import re
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from groq import Groq
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL

    def _call_llm(self, messages: List[Dict], temperature: float = 0.7) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise

    def _extract_json(self, text: str) -> Dict:
        """Extract JSON from LLM response, handling markdown code blocks."""
        # Try to find JSON in code blocks first
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if json_match:
            text = json_match.group(1)

        # Clean up the text
        text = text.strip()

        # Try to parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object or array
            start_idx = text.find('{')
            if start_idx == -1:
                start_idx = text.find('[')
            if start_idx != -1:
                # Find matching end
                bracket_count = 0
                end_idx = start_idx
                open_char = text[start_idx]
                close_char = '}' if open_char == '{' else ']'

                for i, char in enumerate(text[start_idx:], start_idx):
                    if char == open_char:
                        bracket_count += 1
                    elif char == close_char:
                        bracket_count -= 1
                    if bracket_count == 0:
                        end_idx = i + 1
                        break

                try:
                    return json.loads(text[start_idx:end_idx])
                except json.JSONDecodeError:
                    pass

            logger.error(f"Failed to parse JSON from: {text[:500]}")
            raise ValueError("Could not extract valid JSON from LLM response")

    async def parse_study_plan(
        self,
        plan_text: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Parse a long-term study plan into structured tasks."""

        if not start_date:
            start_date = date.today()
        if not end_date:
            end_date = start_date + timedelta(days=365)

        prompt = f"""You are a GATE CSE preparation expert. Parse the following study plan and convert it into a structured format with daily tasks.

STUDY PLAN:
{plan_text}

START DATE: {start_date.isoformat()}
END DATE: {end_date.isoformat()}

GATE CSE SUBJECTS (use these exact names):
- Data Structures and Algorithms
- Operating Systems
- Database Management Systems
- Computer Networks
- Theory of Computation
- Compiler Design
- Computer Organization and Architecture
- Digital Logic
- Discrete Mathematics
- Engineering Mathematics
- Programming and Data Structures
- Aptitude

TASK NAMING GUIDELINES:
- Title should be specific and actionable (e.g., "Study Binary Search Trees - Insertion & Deletion Operations" NOT just "BST")
- Include the specific concept/topic in the title
- Description should explain:
  * What exactly to study/practice
  * Key concepts to focus on
  * Recommended resources if applicable
  * Expected learning outcomes
- Topic field should be the specific subtopic (e.g., "Binary Search Trees" under "Data Structures and Algorithms")

INSTRUCTIONS:
1. Identify all subjects and topics mentioned
2. Create a logical study schedule spreading tasks across the date range
3. Include revision tasks (mark is_revision: true) - schedule revisions 3-7 days after initial study
4. Estimate realistic study durations (30-120 minutes per task)
5. Prioritize foundational topics before advanced ones
6. Include practice problems and previous year questions
7. Make task titles descriptive and specific
8. Add detailed descriptions explaining what to cover

OUTPUT FORMAT (JSON):
{{
    "goal_title": "GATE 2025 Preparation Plan",
    "subjects_identified": ["Subject1", "Subject2"],
    "monthly_goals": [
        {{"month": "2024-01", "focus_subjects": ["Subject1"], "target": "Complete basics"}}
    ],
    "tasks": [
        {{
            "title": "Study [Topic] - [Specific Concepts] | [Subject Short Name]",
            "description": "Cover the following concepts:\\n- Concept 1: explanation\\n- Concept 2: explanation\\n\\nKey points to remember:\\n- Point 1\\n- Point 2\\n\\nPractice: Solve 5-10 problems on this topic",
            "topic": "Specific topic name",
            "subject": "Subject name from list above",
            "scheduled_date": "YYYY-MM-DD",
            "estimated_minutes": 60,
            "priority": 2,
            "is_revision": false
        }}
    ],
    "weekly_breakdown": {{
        "Week 1": ["Topic 1", "Topic 2"],
        "Week 2": ["Topic 3", "Topic 4"]
    }}
}}

TITLE EXAMPLES:
- "Study Arrays - Time Complexity & Space Analysis | DSA"
- "Practice Linked List Problems - Reversal & Cycle Detection | DSA"
- "Learn Process Scheduling - FCFS, SJF, Priority | OS"
- "Revise SQL Joins - Inner, Outer, Cross Joins | DBMS"
- "Solve PYQs - Graph Algorithms (2018-2023) | DSA"

Generate at least 50 tasks spread across the date range. Be comprehensive and practical.
Return ONLY valid JSON, no other text."""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_llm(messages, temperature=0.3)
        return self._extract_json(response)

    async def generate_daily_tasks(
        self,
        subject: str,
        topic: str,
        available_minutes: int,
        difficulty_level: str = "medium"
    ) -> List[Dict]:
        """Generate specific tasks for a topic."""

        prompt = f"""Generate study tasks for GATE CSE preparation.

SUBJECT: {subject}
TOPIC: {topic}
AVAILABLE TIME: {available_minutes} minutes
DIFFICULTY: {difficulty_level}

Generate 2-4 focused tasks that can be completed in the given time.

TASK NAMING GUIDELINES:
- Title should be specific (e.g., "Practice DFS/BFS Traversal Problems" not just "Graph Practice")
- Description should include what to cover, key concepts, and practice suggestions

OUTPUT FORMAT (JSON array):
[
    {{
        "title": "Specific, actionable task title with topic details",
        "description": "Detailed description of what to study/practice, including:\\n- Key concepts\\n- Practice suggestions\\n- Expected outcomes",
        "estimated_minutes": 30,
        "priority": 2,
        "task_type": "study|practice|revision|pyq"
    }}
]

Return ONLY valid JSON array."""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_llm(messages, temperature=0.5)
        return self._extract_json(response)

    async def reschedule_tasks(
        self,
        skipped_tasks: List[Dict],
        upcoming_schedule: List[Dict],
        available_dates: List[date]
    ) -> List[Dict]:
        """Intelligently reschedule skipped tasks."""

        prompt = f"""You are a GATE preparation scheduler. Reschedule these skipped tasks intelligently.

SKIPPED TASKS:
{json.dumps(skipped_tasks, default=str, indent=2)}

CURRENT UPCOMING SCHEDULE (next 7 days):
{json.dumps(upcoming_schedule, default=str, indent=2)}

AVAILABLE DATES FOR RESCHEDULING:
{[d.isoformat() for d in available_dates]}

RULES:
1. Don't overload any single day (max 4 hours of study)
2. Maintain subject variety each day
3. Prioritize high-priority tasks
4. Consider task dependencies (basics before advanced)
5. Space out same-subject tasks

OUTPUT FORMAT (JSON array):
[
    {{
        "original_task_id": 123,
        "new_scheduled_date": "YYYY-MM-DD",
        "reason": "Brief explanation"
    }}
]

Return ONLY valid JSON array."""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_llm(messages, temperature=0.4)
        return self._extract_json(response)

    async def generate_insights(
        self,
        progress_data: Dict[str, Any],
        recent_tasks: List[Dict],
        subject_stats: List[Dict]
    ) -> List[Dict]:
        """Generate personalized insights based on progress data."""

        prompt = f"""Analyze this GATE preparation progress and generate actionable insights.

PROGRESS SUMMARY:
{json.dumps(progress_data, default=str, indent=2)}

RECENT TASKS (last 14 days):
{json.dumps(recent_tasks, default=str, indent=2)}

SUBJECT-WISE STATS:
{json.dumps(subject_stats, default=str, indent=2)}

Generate 3-5 specific, actionable insights. Types:
- weak_subject: Subjects needing more attention
- consistency_drop: Patterns of missed days/tasks
- overload: Days with too many tasks
- missed_revision: Topics that need revision
- strength: Subjects where progress is good
- recommendation: Specific study suggestions

OUTPUT FORMAT (JSON array):
[
    {{
        "insight_type": "weak_subject",
        "title": "Short, clear title",
        "content": "Detailed insight with specific recommendations",
        "priority": 1,
        "data": {{"subject": "OS", "completion_rate": 0.45}}
    }}
]

Be specific, data-driven, and constructive. Return ONLY valid JSON array."""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_llm(messages, temperature=0.6)
        return self._extract_json(response)

    async def mentor_chat(
        self,
        user_message: str,
        chat_history: List[Dict],
        context: Dict[str, Any]
    ) -> Tuple[str, Optional[Dict]]:
        """GATE mentor chatbot with context awareness."""

        # Format task list for context
        tasks_list = context.get('tasks_list', [])
        tasks_context = ""
        if tasks_list:
            tasks_context = "\n\nCURRENT TASKS (ID - Title - Subject - Status - Date):\n"
            for t in tasks_list[:20]:  # Limit to 20 tasks
                tasks_context += f"- ID:{t['id']} | {t['title']} | {t.get('subject', 'N/A')} | {t['status']} | {t['date']}\n"

        system_prompt = f"""You are a senior GATE CSE mentor with 20+ years of experience. Your role:

1. PERSONALITY:
- Be strict but supportive
- Give practical, actionable advice
- Don't sugarcoat - be honest about preparation gaps
- Motivate without false promises

2. CAPABILITIES:
You can help with:
- Answering "What should I study today?"
- Explaining concepts
- Suggesting study strategies
- Analyzing why the student is falling behind
- Creating or modifying study plans
- Deleting tasks when asked
- Editing tasks when asked
- Providing motivation and reality checks

3. CONTEXT AWARENESS:
You have access to the student's:
- Today's tasks and completion status
- Weekly progress
- Subject-wise performance
- Recent insights
- Full task list with IDs
{tasks_context}

4. ACTIONS:
You can perform these actions by including a JSON block in your response:

To CREATE new tasks:
```action
{{"action": "create_tasks", "tasks": [
    {{"title": "Specific task title", "description": "What to cover", "topic": "Topic", "subject": "Subject Name", "scheduled_date": "YYYY-MM-DD", "estimated_minutes": 60, "priority": 2}}
]}}
```

To DELETE tasks (when user asks to delete/remove a task):
```action
{{"action": "delete_tasks", "task_ids": [1, 2, 3], "reason": "User requested deletion"}}
```

To EDIT a task:
```action
{{"action": "edit_task", "task_id": 123, "updates": {{"title": "New title", "scheduled_date": "YYYY-MM-DD"}}}}
```

To RESCHEDULE tasks:
```action
{{"action": "reschedule", "task_ids": [1, 2], "new_date": "YYYY-MM-DD", "reason": "Rescheduling as requested"}}
```

IMPORTANT GUIDELINES FOR ACTIONS:
- When user says "delete task about X" or "remove the Y task", find the matching task ID from the task list and use delete_tasks action
- When user says "delete all tasks for today", find all tasks for today and delete them
- When deleting, always confirm what you're deleting in your response
- After any action, briefly explain what you did

IMPORTANT: Be concise. This is a mobile app - responses should be readable on a phone screen."""

        context_info = f"""
STUDENT'S CURRENT CONTEXT:
- Today's Date: {date.today().isoformat()}
- Tasks Today: {context.get('today_tasks_count', 0)} ({context.get('today_completed', 0)} completed)
- Current Streak: {context.get('streak', 0)} days
- This Week's Completion Rate: {context.get('week_completion_rate', 0):.0%}
- Weak Subjects: {', '.join(context.get('weak_subjects', ['None identified']))}
- Strong Subjects: {', '.join(context.get('strong_subjects', ['None identified']))}
- Recent Insights: {context.get('recent_insights', 'No recent insights')}
"""

        messages = [
            {"role": "system", "content": system_prompt + context_info}
        ]

        # Add chat history (last 10 messages)
        for msg in chat_history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

        messages.append({"role": "user", "content": user_message})

        response = self._call_llm(messages, temperature=0.7)

        # Check for action blocks
        action = None
        action_match = re.search(r'```action\s*([\s\S]*?)```', response)
        if action_match:
            try:
                action = json.loads(action_match.group(1))
                # Remove action block from response
                response = re.sub(r'```action\s*[\s\S]*?```', '', response).strip()
            except json.JSONDecodeError:
                pass

        return response, action

    async def suggest_today_plan(
        self,
        available_minutes: int,
        pending_tasks: List[Dict],
        subject_priorities: Dict[str, float]
    ) -> List[int]:
        """Suggest which tasks to prioritize for today."""

        prompt = f"""You're a GATE mentor. Suggest which tasks the student should prioritize today.

AVAILABLE TIME: {available_minutes} minutes

PENDING TASKS:
{json.dumps(pending_tasks, default=str, indent=2)}

SUBJECT PRIORITIES (based on weakness, higher = needs more work):
{json.dumps(subject_priorities, indent=2)}

Select tasks that:
1. Fit within the available time
2. Prioritize weak subjects
3. Maintain variety
4. Include at least one revision task if available

OUTPUT FORMAT (JSON):
{{
    "selected_task_ids": [1, 2, 3],
    "reasoning": "Brief explanation",
    "estimated_total_minutes": 120
}}

Return ONLY valid JSON."""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_llm(messages, temperature=0.4)
        result = self._extract_json(response)
        return result.get("selected_task_ids", [])


# Singleton instance
llm_service = LLMService()
