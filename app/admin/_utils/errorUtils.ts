/**
 * --------------------------------------------------------------------------------
 * USE CASE: Single Toast Notifications (Best for quick alerts)
 * --------------------------------------------------------------------------------
 * Extracts a single human-readable error message from a backend error or response object.
 * 
 * @example
 * try {
 *   await apiCall();
 * } catch (error) {
 *   toast.error(getBackendMessage(error)); // Outputs: "Email: Already exists"
 * }
 */
export function getBackendMessage(input: any): string {
  const data = input?.response?.data || input?.data || input;

  // 1. Check for nested ASP.NET validation errors (e.g., { errors: { Name: ["Required"] } })
  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const errorEntries = Object.entries(data.errors);
    if (errorEntries.length > 0) {
      const [field, msgs]: [string, any] = errorEntries[0];
      const msg = Array.isArray(msgs) ? msgs[0] : msgs;
      if (msg) return `${field}: ${msg}`;
    }
  }

  // 2. Check for standard message/error/title fields
  return (
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors[0] : undefined) ||
    data?.title ||
    input?.message ||
    'Something went wrong'
  );
}

/**
 * --------------------------------------------------------------------------------
 * USE CASE: Error Summaries / Lists (Best for showing all validation issues)
 * --------------------------------------------------------------------------------
 * Extracts all error messages from a backend error or response object as an array.
 * 
 * @example
 * try {
 *   await apiCall();
 * } catch (error) {
 *   const errors = getBackendErrors(error); 
 *   // Returns: ["Name: Required", "Email: Invalid format"]
 *   
 *   toast.error(
 *     <div className="space-y-1">
 *       {errors.map((err, i) => <div key={i}>• {err}</div>)}
 *     </div>
 *   );
 * }
 */
export function getBackendErrors(input: any): string[] {
  const data = input?.response?.data || input?.data || input;

  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    return Object.entries(data.errors).flatMap(([field, msgs]: any) => {
      const messageArray = Array.isArray(msgs) ? msgs : [msgs];
      return messageArray.map((msg: string) => `${field}: ${msg}`);
    });
  }

  if (Array.isArray(data?.errors)) return data.errors;

  const singleMsg = data?.message || data?.error || data?.title || input?.message;
  return singleMsg ? [singleMsg] : ['Something went wrong'];
}
