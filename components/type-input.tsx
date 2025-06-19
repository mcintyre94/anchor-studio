import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { IdlType } from "@coral-xyz/anchor/dist/cjs/idl";
import { PublicKey } from "@solana/web3.js";
import { TypeNode } from "codama";
import { camelToTitleCase } from "@/utils";

interface TypeInputProps {
  type: TypeNode;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
}

export function TypeInput({
  type,
  value,
  onChange,
  placeholder = "",
  className = "",
}: TypeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, or a valid number string (including negative for signed types)
    if (val === "" || /^-?\d*$/.test(val)) {
      onChange(val);
    }
  };

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const pubkey = new PublicKey(e.target.value);
      onChange(pubkey.toString());
    } catch (err) {
      onChange(e.target.value);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    onChange(checked);
  };

  const renderInput = () => {
    if (type.kind === "booleanTypeNode") {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="boolean-checkbox"
            checked={!!value}
            onCheckedChange={handleCheckboxChange}
          />
          <Label htmlFor="boolean-checkbox">{value ? "True" : "False"}</Label>
        </div>
      );
    }

    if (type.kind === "publicKeyTypeNode") {
      return (
        <Input
          type="text"
          value={(value as string) || ""}
          onChange={handlePublicKeyChange}
          placeholder={placeholder || "Enter public key..."}
          className={className}
        />
      );
    }

    if (type.kind === "numberTypeNode") {
      if (type.format === "f32" || type.format === "f64") {
        return (
          <Input
            type="text"
            inputMode="numeric"
            value={value ?? ""}
            onChange={handleNumberChange}
            placeholder={placeholder || `Enter ${type} value...`}
            className={className}
          />
        );
      } else {
        return (
          <Input
            type="text"
            inputMode="numeric"
            value={value ?? ""}
            onChange={handleNumberChange}
            placeholder={placeholder || `Enter ${type} value...`}
            className={className}
          />
        );
      }
    }

    // TODO: better rendering for amountTypeNode
    if (
      (type.kind === "amountTypeNode" || type.kind === "solAmountTypeNode") &&
      type.number.kind === "numberTypeNode"
    ) {
      return (
        <TypeInput
          type={type.number}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
        />
      );
    }

    if (type.kind === "stringTypeNode") {
      return (
        <Input
          type="text"
          value={value || ""}
          onChange={handleChange}
          placeholder={placeholder || "Enter text..."}
          className={className}
        />
      );
    }

    // handle complex types
    if (
      type.kind === "optionTypeNode" ||
      type.kind === "zeroableOptionTypeNode"
    ) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-value"
              checked={value !== undefined && value !== null}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange("");
                } else {
                  onChange(undefined);
                }
              }}
            />
            <Label htmlFor="has-value">
              {value !== undefined && value !== null ? "Has value" : "No value"}
            </Label>
          </div>
          {value !== undefined && value !== null && (
            <div className="pl-6">
              <TypeInput
                type={type.item}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={className}
              />
            </div>
          )}
        </div>
      );
    }

    if (type.kind === "arrayTypeNode") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Array Items</Label>
            <button
              type="button"
              onClick={() => {
                const newArray = Array.isArray(value) ? [...value, ""] : [""];
                onChange(newArray);
              }}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              + Add Item
            </button>
          </div>
          {Array.isArray(value) && value.length > 0 ? (
            <div className="space-y-2 pl-4 border-l-2 border-gray-200">
              {value.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <TypeInput
                    type={type.item}
                    value={item}
                    onChange={(newValue) => {
                      const newArray = [...value];
                      newArray[index] = newValue;
                      onChange(newArray);
                    }}
                    placeholder={`Item ${index + 1}`}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newArray = value.filter((_, i) => i !== index);
                      onChange(newArray);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No items added yet</p>
          )}
        </div>
      );
    }

    if (type.kind === "definedTypeLinkNode") {
      // For custom types, we'll just use a JSON input
      return (
        <div className="space-y-2">
          <Label>{type.name}</Label>
          <textarea
            value={
              typeof value === "string" ? value : JSON.stringify(value, null, 2)
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={`Enter ${camelToTitleCase(type.name)} as JSON...`}
            className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
          />
        </div>
      );
    }

    // TODO: a bunch of types we can render better, just covering the Anchor types for now
    console.warn("TypeInput: unhandled type", type);

    // Fallback for any unhandled types
    return (
      <Input
        type="text"
        value={value || ""}
        onChange={handleChange}
        placeholder={placeholder || "Enter value..."}
        className={className}
      />
    );
  };

  return <div className="w-full">{renderInput()}</div>;
}
