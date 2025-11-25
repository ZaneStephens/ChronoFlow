import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const getMspContext = (isInternal: boolean, clientName?: string) => {
  if (isInternal) {
    return "CONTEXT: You are an IT professional working for a Managed Service Provider (MSP). This is an INTERNAL task/project for your own company. You are an employee speaking to colleagues.";
  }
  return `CONTEXT: You are an IT professional working for a Managed Service Provider (MSP). The client '${clientName || 'the client'}' is an EXTERNAL company you support. You are NOT an employee of the client. Maintain a professional, consultative tone.`;
};

export const generateSubtasks = async (
  taskTitle: string, 
  taskDescription: string, 
  mode: 'technical' | 'csm' = 'technical',
  isInternal: boolean = false
): Promise<{ title: string }[]> => {
  const ai = getAiClient();
  
  const mspContext = getMspContext(isInternal);

  let systemInstruction = "";
  
  if (mode === 'technical') {
    systemInstruction = `
      ${mspContext}
      You are an expert IT Support Professional specializing in the Microsoft Stack (Azure, Microsoft 365, Intune, Windows Server, PowerShell).
      Break down the task into 3 to 6 actionable, technical subtasks to troubleshoot or accomplish the goal.
      Focus on specific technical steps (e.g., "Check Entra ID logs", "Verify Intune policy sync").
    `;
  } else {
    systemInstruction = `
      ${mspContext}
      You are a dedicated Customer Success Manager (CSM) & Account Manager.
      Break down the task into 3 to 6 non-technical, client-facing subtasks.
      Focus on relationship management, setting expectations, communicating business value, and follow-up. 
      (e.g., "Schedule kick-off call", "Draft impact summary email", "Review SLA requirements").
    `;
  }

  const prompt = `
    Task: ${taskTitle}
    Description: ${taskDescription}
    
    Return ONLY a raw JSON array of objects with a 'title' property. 
    Example: [{"title": "Step 1"}, {"title": "Step 2"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return [];
  }
};

export const generateClientReport = async (
  clientName: string, 
  startDate: string, 
  endDate: string, 
  items: { title: string; durationMinutes: number; status: string; notes: string[] }[],
  isInternal: boolean = false
) => {
  const ai = getAiClient();
  
  const itemsSummary = items.map(t => {
    const notesSummary = t.notes.length > 0 ? `\n    - Activity Notes: ${t.notes.join('; ')}` : '';
    return `- ${t.title} (${t.durationMinutes} mins) [Status: ${t.status}]${notesSummary}`;
  }).join('\n');
  
  const totalMinutes = items.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const mspContext = getMspContext(isInternal, clientName);

  const prompt = `
    ${mspContext}
    You are generating a formal status report email.
    
    Client: ${clientName}
    Period: ${startDate} to ${endDate}
    Total Time Logged: ${totalHours} hours
    
    Work Items Completed:
    ${itemsSummary}
    
    Task: Write a professional, polite, and clear email report summarizing the work completed during this period.
    
    Guidelines:
    - Start with a polite greeting and a summary of the total time spent.
    - Group related items logically (e.g. "Server Maintenance", "User Support") if possible, rather than just listing them chronologically.
    - Use the "Activity Notes" provided to add context to what was actually done, but summarize them professionally.
    - Highlight any resolved tickets or completed tasks clearly.
    - The tone should be professional, helpful, and concise, suitable for a freelance IT expert communicating with a business client.
    - Sign off as "ChronoFlow IT Services".
    - Do not use placeholders like "[Your Name]".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Report Error:", error);
    return "Error generating report. Please check your API key and Internet connection.";
  }
};

export const generateTaskReport = async (
  taskTitle: string,
  taskDescription: string,
  status: string,
  totalHours: string,
  subtasks: { title: string; isCompleted: boolean }[],
  workLogs: { date: string; durationMinutes: number; notes: string }[],
  clientName: string,
  isInternal: boolean = false
) => {
  const ai = getAiClient();

  const subtaskSummary = subtasks.map(s => `- [${s.isCompleted ? 'x' : ' '}] ${s.title}`).join('\n');
  const logSummary = workLogs.map(l => `- ${l.date} (${l.durationMinutes}m): ${l.notes}`).join('\n');
  
  const mspContext = getMspContext(isInternal, clientName);

  const prompt = `
    ${mspContext}
    You are generating a detailed progress report for a specific technical task.

    Task: ${taskTitle}
    Description: ${taskDescription || 'N/A'}
    Current Status: ${status}
    Total Time Logged: ${totalHours} hours

    Subtasks Breakdown:
    ${subtaskSummary || 'No subtasks defined.'}

    Work History (Chronological):
    ${logSummary || 'No time logs recorded for this period.'}

    Task: Write a detailed technical summary report for this task.
    
    Guidelines:
    - Summarize the overall progress and current state of the task.
    - Highlight completed subtasks and any outstanding work.
    - Analyze the work history to provide a narrative of what was done, referencing specific technical details found in the notes.
    - Identify any potential blockers or areas requiring attention based on the notes.
    - Tone: Professional, technical, and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Task Report Error:", error);
    return "Error generating task report.";
  }
};

// --- Project Management AI ---

export const generateProjectPlan = async (
  projectGoal: string,
  clientName: string,
  isInternal: boolean = false
): Promise<{ description: string; milestones: { title: string; dueDateOffsetDays: number }[]; risks: { risk: string; impact: string; mitigation: string }[] }> => {
  const ai = getAiClient();

  const mspContext = getMspContext(isInternal, clientName);

  const prompt = `
    ${mspContext}
    You are a Senior Technical Project Manager. 
    Create a project plan for the following goal: "${projectGoal}" for client "${clientName}".

    Return a JSON object containing:
    1. 'description': A professional, scope-defining description of the project (max 2 sentences).
    2. 'milestones': An array of 4-6 key milestones. Each has a 'title' and 'dueDateOffsetDays' (number of days from start).
    3. 'risks': An array of 3 potential project risks. Each has 'risk' (name), 'impact' ('High', 'Medium', 'Low'), and 'mitigation' (short strategy).

    Example JSON Structure:
    {
      "description": "Migrating legacy exchange to O365...",
      "milestones": [{ "title": "Planning", "dueDateOffsetDays": 5 }],
      "risks": [{ "risk": "Data Loss", "impact": "High", "mitigation": "Backups" }]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                milestones: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            dueDateOffsetDays: { type: Type.INTEGER }
                        }
                    }
                },
                risks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            risk: { type: Type.STRING },
                            impact: { type: Type.STRING },
                            mitigation: { type: Type.STRING }
                        }
                    }
                }
            }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini AI Project Plan Error:", error);
    return {
        description: "Could not generate plan.",
        milestones: [],
        risks: []
    };
  }
};

export const updateProjectPlan = async (
    projectTitle: string,
    currentDescription: string,
    completedMilestones: string[],
    changeDescription: string,
    isInternal: boolean = false
): Promise<{ newMilestones: { title: string; dueDateOffsetDays: number }[]; newRisks: { risk: string; impact: string; mitigation: string }[] }> => {
    const ai = getAiClient();

    const mspContext = getMspContext(isInternal);

    const prompt = `
      ${mspContext}
      You are a Senior Technical Project Manager re-planning a project due to a scope change or roadblock.
      
      Project: ${projectTitle}
      Description: ${currentDescription}
      Completed Work: ${completedMilestones.join(', ') || "None"}
      
      New Situation / Roadblock: "${changeDescription}"
      
      Task: Generate a *revised* set of REMAINING milestones and updated risks.
      Do NOT include work that is already completed.
      The new milestones should account for the delay or change in scope.
      
      Return JSON:
      {
        "newMilestones": [{ "title": "Revised Step 1", "dueDateOffsetDays": 5 }],
        "newRisks": [{ "risk": "New Risk", "impact": "High", "mitigation": "Strategy" }]
      }
    `;
    
    try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    newMilestones: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                dueDateOffsetDays: { type: Type.INTEGER }
                            }
                        }
                    },
                    newRisks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                risk: { type: Type.STRING },
                                impact: { type: Type.STRING },
                                mitigation: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
          }
        });
    
        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        return JSON.parse(text);
      } catch (error) {
        console.error("Gemini AI Re-Plan Error:", error);
        return {
            newMilestones: [],
            newRisks: []
        };
      }
}