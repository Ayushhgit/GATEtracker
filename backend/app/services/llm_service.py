import json
import re
import time
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

    def _call_llm(self, messages: List[Dict], temperature: float = 0.7, max_retries: int = 3) -> str:
        """Call LLM with retry logic."""
        last_error = None

        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=4096,
                )
                content = response.choices[0].message.content

                # Check for empty response
                if not content or content.strip() == "":
                    logger.warning(f"Empty response from LLM (attempt {attempt + 1})")
                    if attempt < max_retries - 1:
                        time.sleep(1 * (attempt + 1))  # Backoff
                        continue
                    raise ValueError("LLM returned empty response")

                return content

            except Exception as e:
                last_error = e
                logger.error(f"LLM call failed (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(1 * (attempt + 1))  # Backoff
                    continue
                raise

        raise last_error or ValueError("LLM call failed after retries")

    def _extract_json(self, text: str) -> Dict:
        """Extract JSON from LLM response, handling markdown code blocks."""
        # Handle empty or None response
        if not text or text.strip() == "":
            logger.error("Empty text provided to _extract_json")
            raise ValueError("Empty response from LLM")

        # Try to find JSON in code blocks first
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if json_match:
            text = json_match.group(1)

        # Clean up the text
        text = text.strip()

        # Handle empty after stripping
        if not text:
            raise ValueError("Empty JSON content after parsing")

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
            end_date = start_date + timedelta(days=90)  # 3 months by default

        # Truncate very long plans to avoid token limits
        max_plan_length = 3000
        if len(plan_text) > max_plan_length:
            plan_text = plan_text[:max_plan_length] + "\n... (plan truncated)"
            logger.warning(f"Plan text truncated from {len(plan_text)} to {max_plan_length} chars")

        prompt = f"""Parse this GATE CSE study plan into structured tasks. Return JSON only.

PLAN:
{plan_text}

DATE RANGE: {start_date.isoformat()} to {end_date.isoformat()}

SUBJECTS: Data Structures and Algorithms, Operating Systems, Database Management Systems, Computer Networks, Theory of Computation, Compiler Design, Computer Organization and Architecture, Digital Logic, Discrete Mathematics, Engineering Mathematics

OUTPUT JSON FORMAT:
{{
    "goal_title": "GATE Preparation Plan",
    "subjects_identified": ["Subject1", "Subject2"],
    "tasks": [
        {{
            "title": "Study Topic - Key Concepts | Subject",
            "description": "Brief description of what to cover",
            "topic": "Topic name",
            "subject": "Subject name",
            "scheduled_date": "YYYY-MM-DD",
            "estimated_minutes": 60,
            "priority": 2,
            "is_revision": false
        }}
    ],
    "weekly_breakdown": {{"Week 1": ["Topic 1", "Topic 2"]}}
}}

Generate 15-25 tasks spread across the date range. Return ONLY valid JSON."""

        messages = [{"role": "user", "content": prompt}]

        try:
            response = self._call_llm(messages, temperature=0.3)
            return self._extract_json(response)
        except Exception as e:
            logger.error(f"Failed to parse study plan: {e}")
            # Return a fallback response
            return {
                "goal_title": "GATE Preparation Plan",
                "subjects_identified": [],
                "tasks": [],
                "weekly_breakdown": {},
                "error": str(e)
            }

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

        # Limit the data sent to LLM to avoid token issues
        recent_tasks_limited = recent_tasks[:20] if recent_tasks else []
        subject_stats_limited = subject_stats[:10] if subject_stats else []

        # Create a compact summary
        summary = {
            "period": progress_data.get("period", "Last 14 days"),
            "total_tasks": progress_data.get("total_tasks", 0),
            "completed": progress_data.get("completed_tasks", 0),
            "completion_rate": progress_data.get("completion_rate", 0),
        }

        prompt = f"""Analyze GATE preparation progress. Return JSON array only.

SUMMARY: {json.dumps(summary)}
SUBJECTS: {json.dumps(subject_stats_limited, default=str)}

Generate 2-4 insights. Types: weak_subject, consistency_drop, strength, recommendation

OUTPUT (JSON array):
[{{"insight_type": "type", "title": "Short title", "content": "Brief recommendation", "priority": 1, "data": {{}}}}]

Return ONLY valid JSON array."""

        messages = [{"role": "user", "content": prompt}]

        try:
            response = self._call_llm(messages, temperature=0.6)
            result = self._extract_json(response)
            # Ensure it's a list
            if isinstance(result, dict):
                return [result]
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to generate insights: {e}")
            # Return a fallback insight
            return [{
                "insight_type": "recommendation",
                "title": "Keep up the good work!",
                "content": "Continue with your study plan and maintain consistency.",
                "priority": 2,
                "data": {}
            }]

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
You can perform actions by including a special command block in your response. Use this exact format:

To CREATE new tasks, include this in your response:
<<ACTION_CREATE_TASKS>>
title: Specific task title
description: What to cover
topic: Topic name
subject: Subject Name (from GATE subjects list)
date: YYYY-MM-DD
minutes: 60
priority: 2
<<END_ACTION>>

You can create multiple tasks by repeating the block.

To DELETE tasks (when user asks to delete/remove a task):
<<ACTION_DELETE_TASKS>>
ids: 1, 2, 3
reason: User requested deletion
<<END_ACTION>>

To EDIT a task:
<<ACTION_EDIT_TASK>>
id: 123
title: New title (optional)
date: YYYY-MM-DD (optional)
description: New description (optional)
<<END_ACTION>>

To RESCHEDULE tasks:
<<ACTION_RESCHEDULE>>
ids: 1, 2
new_date: YYYY-MM-DD
reason: Rescheduling as requested
<<END_ACTION>>

IMPORTANT GUIDELINES FOR ACTIONS:
- When user says "delete task about X" or "remove the Y task", find the matching task ID from the task list and use DELETE action
- When user says "delete all tasks for today", find all tasks for today and delete them
- When deleting, always confirm what you're deleting in your response
- After any action, briefly explain what you did
- Do NOT use JSON format for actions - use the <<ACTION_...>> format shown above

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

        # Check for action blocks using new format
        action = self._parse_action_blocks(response)

        # Remove action blocks from response
        response = re.sub(r'<<ACTION_\w+>>[\s\S]*?<<END_ACTION>>', '', response).strip()
        # Also clean up any stray JSON-style action blocks that might slip through
        response = re.sub(r'```action\s*[\s\S]*?```', '', response).strip()
        response = re.sub(r'```json\s*\{["\']?action["\']?\s*:[\s\S]*?```', '', response).strip()

        return response, action

    def _parse_action_blocks(self, text: str) -> Optional[Dict]:
        """Parse action blocks from LLM response."""

        # Check for CREATE_TASKS action
        create_match = re.search(r'<<ACTION_CREATE_TASKS>>([\s\S]*?)<<END_ACTION>>', text)
        if create_match:
            content = create_match.group(1).strip()
            tasks = []

            # Parse each task block
            lines = content.split('\n')
            current_task = {}

            for line in lines:
                line = line.strip()
                if not line:
                    if current_task:
                        tasks.append(current_task)
                        current_task = {}
                    continue

                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if key == 'title':
                        current_task['title'] = value
                    elif key == 'description':
                        current_task['description'] = value
                    elif key == 'topic':
                        current_task['topic'] = value
                    elif key == 'subject':
                        current_task['subject'] = value
                    elif key == 'date':
                        current_task['scheduled_date'] = value
                    elif key == 'minutes':
                        try:
                            current_task['estimated_minutes'] = int(value)
                        except:
                            current_task['estimated_minutes'] = 60
                    elif key == 'priority':
                        try:
                            current_task['priority'] = int(value)
                        except:
                            current_task['priority'] = 2

            if current_task:
                tasks.append(current_task)

            if tasks:
                return {"action": "create_tasks", "tasks": tasks}

        # Check for DELETE_TASKS action
        delete_match = re.search(r'<<ACTION_DELETE_TASKS>>([\s\S]*?)<<END_ACTION>>', text)
        if delete_match:
            content = delete_match.group(1).strip()
            task_ids = []
            reason = ""

            for line in content.split('\n'):
                line = line.strip()
                if line.startswith('ids:'):
                    ids_str = line.replace('ids:', '').strip()
                    for id_str in ids_str.replace(',', ' ').split():
                        try:
                            task_ids.append(int(id_str.strip()))
                        except:
                            pass
                elif line.startswith('reason:'):
                    reason = line.replace('reason:', '').strip()

            if task_ids:
                return {"action": "delete_tasks", "task_ids": task_ids, "reason": reason}

        # Check for EDIT_TASK action
        edit_match = re.search(r'<<ACTION_EDIT_TASK>>([\s\S]*?)<<END_ACTION>>', text)
        if edit_match:
            content = edit_match.group(1).strip()
            task_id = None
            updates = {}

            for line in content.split('\n'):
                line = line.strip()
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if key == 'id':
                        try:
                            task_id = int(value)
                        except:
                            pass
                    elif key == 'title':
                        updates['title'] = value
                    elif key == 'date':
                        updates['scheduled_date'] = value
                    elif key == 'description':
                        updates['description'] = value

            if task_id and updates:
                return {"action": "edit_task", "task_id": task_id, "updates": updates}

        # Check for RESCHEDULE action
        reschedule_match = re.search(r'<<ACTION_RESCHEDULE>>([\s\S]*?)<<END_ACTION>>', text)
        if reschedule_match:
            content = reschedule_match.group(1).strip()
            task_ids = []
            new_date = ""
            reason = ""

            for line in content.split('\n'):
                line = line.strip()
                if line.startswith('ids:'):
                    ids_str = line.replace('ids:', '').strip()
                    for id_str in ids_str.replace(',', ' ').split():
                        try:
                            task_ids.append(int(id_str.strip()))
                        except:
                            pass
                elif line.startswith('new_date:'):
                    new_date = line.replace('new_date:', '').strip()
                elif line.startswith('reason:'):
                    reason = line.replace('reason:', '').strip()

            if task_ids and new_date:
                return {"action": "reschedule", "task_ids": task_ids, "new_date": new_date, "reason": reason}

        # Fallback: check for old JSON format (for backward compatibility)
        action_match = re.search(r'```action\s*([\s\S]*?)```', text)
        if action_match:
            try:
                return json.loads(action_match.group(1))
            except json.JSONDecodeError:
                pass

        return None

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
