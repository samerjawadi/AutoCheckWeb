// Pure financial helpers — no Supabase dependency (safe to test without mocks)

export const calcTotal = (lines) =>
  (lines ?? []).reduce((s, l) => s + Math.max(0, parseFloat(l.price) || 0), 0);

export const calcPaid = (payments) =>
  (payments ?? []).reduce((s, p) => s + Math.max(0, parseFloat(p.amount) || 0), 0);

export const calcBalance = (lines, payments) =>
  calcTotal(lines) - calcPaid(payments);

export const payLabel = (lines, payments) => {
  const total = calcTotal(lines);
  const paid  = calcPaid(payments);
  if (total === 0)    return "Paid";
  if (paid <= 0)      return "Unpaid";
  if (paid >= total)  return "Paid";
  return "Partial";
};

export const validators = {
  customer: (item) => {
    if (!item.name?.trim())  return "Name is required";
    if (!item.phone?.trim()) return "Phone is required";
    return null;
  },
  car: (item) => {
    if (!item.customerId)           return "Owner is required";
    if (!item.plate?.trim())        return "Plate is required";
    if (!item.manufacturer?.trim()) return "Constructor is required";
    if (!item.model?.trim())        return "Model is required";
    return null;
  },
  job: (item) => {
    if (!item.customerId) return "Customer is required";
    if (!item.carId)      return "Car is required";
    if (!item.dateIn)     return "Date in is required";
    if (item.dateOut && item.dateIn && item.dateOut < item.dateIn)
      return "Date out cannot be before date in";
    return null;
  },
  payment: (p) => {
    const amount = parseFloat(p.amount);
    if (!p.date)                    return "Date is required";
    if (isNaN(amount) || amount <= 0) return "Amount must be greater than 0";
    return null;
  },
  jobLine: (line) => {
    if (!line.description?.trim()) return "Description is required";
    const price = parseFloat(line.price);
    if (isNaN(price) || price < 0) return "Price must be 0 or greater";
    return null;
  },
};
