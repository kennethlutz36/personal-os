(()=>{
  const ds=window.PersonalOSData;
  if(!ds) return;

  async function functionErrorMessage(error,fallback){
    let message=error?.message||fallback;
    let detail='';
    const ctx=error?.context;
    if(ctx&&typeof ctx.clone==='function'){
      try{
        const payload=await ctx.clone().json();
        if(payload?.error) message=String(payload.error);
        if(payload?.detail) detail=String(payload.detail);
      }catch(_){
        try{
          const text=await ctx.clone().text();
          if(text&&text.length<500) detail=text;
        }catch(_e){}
      }
    }
    if(detail&&detail!==message) message+=` ${detail}`;
    return message||fallback;
  }

  ds.connectApple=async(appleId,appPassword)=>{
    const {data,error}=await ds.client.functions.invoke('apple-calendar',{body:{action:'connect',appleId,appPassword}});
    if(error) throw new Error(await functionErrorMessage(error,'Apple Calendar connection failed'));
    if(data?.error) throw new Error([data.error,data.detail].filter(Boolean).join(' '));
    return data;
  };

  ds.syncApple=async()=>{
    const {data,error}=await ds.client.functions.invoke('apple-calendar',{body:{action:'sync'}});
    if(error) throw new Error(await functionErrorMessage(error,'Apple Calendar sync failed'));
    if(data?.error) throw new Error([data.error,data.detail].filter(Boolean).join(' '));
    return data;
  };
})();
